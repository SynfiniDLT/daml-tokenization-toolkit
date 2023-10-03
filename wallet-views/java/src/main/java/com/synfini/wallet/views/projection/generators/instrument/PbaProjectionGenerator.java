package com.synfini.wallet.views.projection.generators.instrument;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ArchivedEvent;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.Event;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.Util;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.PbaInstrumentEvent;
import com.synfini.wallet.views.projection.events.TokenInstrumentEvent;
import synfini.interface$.instrument.partyboundattributes.instrument.Instrument;
import synfini.interface$.instrument.partyboundattributes.instrument.View;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public class PbaProjectionGenerator implements ProjectionGenerator<Event, PbaInstrumentEvent> {
  private final String readAs;

  public PbaProjectionGenerator(String readAs) {
    this.readAs = readAs;
  }


  @Override
  public BatchSource<Event> source(GrpcClientSettings grpcClientSettings) {
    return BatchSource.events(grpcClientSettings);
  }

  @Override
  public Projection<Event> projection() {
    return Projection.create(
      new ProjectionId("pba-instruments-projection-for-" + readAs),
      ProjectionFilter.singleContractType(
        Set.of(readAs),
        Instrument.INTERFACE
      )
    );
  }

  @Override
  public Project<Event, PbaInstrumentEvent> project() {
    return envelope -> {
      final var event = envelope.getEvent();
      if (event instanceof CreatedEvent) {
        final CreatedEvent createdEvent = (CreatedEvent) event;
        final var view = Util.getView(createdEvent, Instrument.INTERFACE.TEMPLATE_ID, View.valueDecoder());
        if (
          view.isPresent() &&
            createdEvent.getSignatories().containsAll(
              List.of(view.get().instrument.depository, view.get().instrument.issuer)
            )
        ) {
          return List.of(
            new PbaInstrumentEvent(
              createdEvent.getContractId(),
              envelope.getOffset(),
              envelope.getLedgerEffectiveTime(),
              view
            )
          );
        }
      } else if (event instanceof ArchivedEvent) {
        return List.of(
          new PbaInstrumentEvent(
            event.getContractId(),
            envelope.getOffset(),
            envelope.getLedgerEffectiveTime(),
            Optional.empty()
          )
        );
      }

      return Collections.emptyList();
    };
  }

  @Override
  public BatchRows<PbaInstrumentEvent, JdbcAction> batchRows() {
    final var table = "pba_instruments";
    final var bind = Sql.<PbaInstrumentEvent>binder(
    "INSERT INTO " + table + "\n" +
      "        (cid,  instrument_depository,  instrument_issuer,  instrument_id,  instrument_version,  description,  valid_as_of,  owner,  attributes,  create_offset,  create_effective_time)\n" +
      "VALUES (:cid, :instrument_depository, :instrument_issuer, :instrument_id, :instrument_version, :description, :valid_as_of, :owner, :attributes, :create_offset, :create_effective_time)\n" +
      "ON CONFLICT(cid) DO UPDATE SET\n" +
      "  archive_offset = CASE WHEN :update_archive_offset THEN :archive_offset ELSE " + table + ".archive_offset END,\n" +
      "  archive_effective_time = CASE WHEN :update_archive_effective_time THEN :archive_effective_time ELSE " + table + ".archive_effective_time END\n"
    )
    .bind("cid", e -> e.contractId, Bind.String())
    .bind("instrument_depository", e -> e.view.map(v -> v.instrument.depository).orElse(""), Bind.String())
    .bind("instrument_issuer", e -> e.view.map(v -> v.instrument.issuer).orElse(""), Bind.String())
    .bind("instrument_id", e -> e.view.map(v -> v.instrument.id.unpack).orElse(""), Bind.String())
    .bind("instrument_version", e -> e.view.map(v -> v.instrument.version).orElse(""), Bind.String())
    .bind("description", e -> e.view.map(v -> v.description).orElse(""), Bind.String())
    .bind("valid_as_of", e -> e.view.map(v -> v.validAsOf).orElse(Instant.EPOCH), Bind.Instant())
    .bind("owner", e -> e.view.map(v -> v.owner).orElse(""), Bind.String())
    .bind("attributes", e -> e.view.map(v -> v.attributes).orElse(Collections.emptyMap()), Bind.Any())
    .bind("create_offset", e -> e.offset.map(o -> o.value()), Bind.Optional(Bind.String()))
    .bind("create_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()))
    .bind("update_archive_offset",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_offset", e -> e.offset.map(o -> o.value()), Bind.Optional(Bind.String()))
    .bind("update_archive_effective_time",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()));

    return UpdateMany.create(bind);
  }
}
