package com.synfini.wallet.views.projection.generators.instrument;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ArchivedEvent;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.DamlRecord;
import com.daml.ledger.javaapi.data.Event;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.Util;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.TokenInstrumentEvent;
import daml.finance.interface$.instrument.token.instrument.Instrument;
import daml.finance.interface$.instrument.token.instrument.View;

import java.time.Instant;
import java.util.*;

public class TokenProjectionGenerator implements ProjectionGenerator<Event, TokenInstrumentEvent> {
  private final String readAs;

  public TokenProjectionGenerator(String readAs) {
    this.readAs = readAs;
  }

  @Override
  public BatchSource<Event> source(GrpcClientSettings grpcClientSettings) {
    return BatchSource.events(grpcClientSettings);
  }

  @Override
  public Projection<Event> projection() {
    return Projection.create(
      new ProjectionId("token-instruments-projection-for-" + readAs),
      ProjectionFilter.singleContractType(
        Set.of(readAs),
        Instrument.INTERFACE
      )
    );
  }

  @Override
  public Project<Event, TokenInstrumentEvent> project() {
    return envelope -> {
      final var event = envelope.getEvent();
      if (event instanceof CreatedEvent) {
        final CreatedEvent createdEvent = (CreatedEvent) event;
        final var view = Util.getView(createdEvent, Instrument.INTERFACE.TEMPLATE_ID, View.valueDecoder());
        if (
          view.isPresent() &&
          createdEvent.getSignatories().containsAll(
            List.of(view.get().token.instrument.depository, view.get().token.instrument.issuer)
          )
        ) {
          return List.of(
            new TokenInstrumentEvent(
              createdEvent.getContractId(),
              envelope.getOffset(),
              envelope.getLedgerEffectiveTime(),
              Optional.empty(),
              view
            )
          );
        }
      } else if (event instanceof ArchivedEvent) {
        return List.of(
          new TokenInstrumentEvent(
            event.getContractId(),
            envelope.getOffset(),
            envelope.getLedgerEffectiveTime(),
            Optional.empty(),
            Optional.empty()
          )
        );
      }

      return Collections.emptyList();
    };
  }

  @Override
  public BatchRows<TokenInstrumentEvent, JdbcAction> batchRows() {
    final var table = "token_instruments";
    final var bind = Sql.<TokenInstrumentEvent>binder(
      "INSERT INTO " + table + "\n" +
        "        (cid,  instrument_depository,  instrument_issuer,  instrument_id,  instrument_version,  description,  valid_as_of,  create_offset,  create_effective_time)\n" +
        "VALUES (:cid, :instrument_depository, :instrument_issuer, :instrument_id, :instrument_version, :description, :valid_as_of, :create_offset, :create_effective_time)\n" +
        "ON CONFLICT(cid) DO UPDATE SET\n" +
        "  archive_offset = CASE WHEN :update_archive_offset THEN :archive_offset ELSE " + table + ".archive_offset END,\n" +
        "  archive_effective_time = CASE WHEN :update_archive_effective_time THEN :archive_effective_time ELSE " + table + ".archive_effective_time END\n"
    )
    .bind("cid", e -> e.contractId, Bind.String())
    .bind("instrument_depository", e -> e.view.map(v -> v.token.instrument.depository).orElse(""), Bind.String())
    .bind("instrument_issuer", e -> e.view.map(v -> v.token.instrument.issuer).orElse(""), Bind.String())
    .bind("instrument_id", e -> e.view.map(v -> v.token.instrument.id.unpack).orElse(""), Bind.String())
    .bind("instrument_version", e -> e.view.map(v -> v.token.instrument.version).orElse(""), Bind.String())
    .bind("description", e -> e.view.map(v -> v.token.description).orElse(""), Bind.String())
    .bind("valid_as_of", e -> e.view.map(v -> v.token.validAsOf).orElse(Instant.EPOCH), Bind.Instant())
    .bind("create_offset", e -> e.offset.map(o -> o.value()), Bind.Optional(Bind.String()))
    .bind("create_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()))
    .bind("update_archive_offset",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_offset", e -> e.offset.map(o -> o.value()), Bind.Optional(Bind.String()))
    .bind("update_archive_effective_time",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()));

    return UpdateMany.create(bind);
  }
}
