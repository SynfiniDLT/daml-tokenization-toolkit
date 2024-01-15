package com.synfini.wallet.views.projection.generators.issuer;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ArchivedEvent;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.Event;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.Util;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.TokenIssuerEvent;
import synfini.interface$.onboarding.issuer.instrument.token.issuer.Issuer;
import synfini.interface$.onboarding.issuer.instrument.token.issuer.View;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public class TokenIssuerProjectionGenerator implements ProjectionGenerator<Event, TokenIssuerEvent> {
  private final String readAs;

  public TokenIssuerProjectionGenerator(String readAs) {
    this.readAs = readAs;
  }

  @Override
  public BatchSource<Event> source(GrpcClientSettings grpcClientSettings) {
    return BatchSource.events(grpcClientSettings);
  }

  @Override
  public Projection<Event> projection() {
    return Projection.create(
      new ProjectionId("token-issuer-projection-for-" + readAs),
      ProjectionFilter.singleContractType(
        Set.of(readAs),
        Issuer.INTERFACE
      )
    );
  }

  @Override
  public Project<Event, TokenIssuerEvent> project() {
    return envelope -> {
      final var event = envelope.getEvent();
      if (event instanceof CreatedEvent) {
        final CreatedEvent createdEvent = (CreatedEvent) event;
        final var view = Util.getView(createdEvent, Issuer.TEMPLATE_ID, View.valueDecoder());
        if (view.isPresent()) {
          return List.of(
            new TokenIssuerEvent(
              createdEvent.getContractId(),
              envelope.getOffset(),
              envelope.getLedgerEffectiveTime(),
              view
            )
          );
        }
      } else if (event instanceof ArchivedEvent) {
        return List.of(
          new TokenIssuerEvent(
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
  public BatchRows<TokenIssuerEvent, JdbcAction> batchRows() {
    final var table = "token_instrument_issuers";
    final var bind = Sql.<TokenIssuerEvent>binder(
      "INSERT INTO " + table + "\n" +
        "        (cid,  depository,  issuer,  instrument_factory_cid,  create_offset,  create_effective_time)\n" +
        "VALUES (:cid, :depository, :issuer, :instrument_factory_cid, :create_offset, :create_effective_time)\n" +
        "ON CONFLICT(cid) DO UPDATE SET\n" +
        "  archive_offset = CASE WHEN :update_archive_offset THEN :archive_offset ELSE " + table + ".archive_offset END,\n" +
        "  archive_effective_time = CASE WHEN :update_archive_effective_time THEN :archive_effective_time ELSE " + table + ".archive_effective_time END\n"
    )
    .bind("cid", e -> e.contractId, Bind.String())
    .bind("depository", e -> e.view.map(v -> v.depository).orElse(""), Bind.String())
    .bind("issuer", e -> e.view.map(v -> v.issuer).orElse(""), Bind.String())
    .bind("instrument_factory_cid", e -> e.view.map(v -> v.instrumentFactoryCid.contractId).orElse(""), Bind.String())
    .bind("create_offset", e -> e.offset.map(o -> o.value()), Bind.Optional(Bind.String()))
    .bind("create_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()))
    .bind("update_archive_offset",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_offset", e -> e.offset.map(o -> o.value()), Bind.Optional(Bind.String()))
    .bind("update_archive_effective_time",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()));

    return UpdateMany.create(bind);
  }
}
