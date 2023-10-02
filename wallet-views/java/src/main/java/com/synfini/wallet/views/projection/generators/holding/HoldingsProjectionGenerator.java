package com.synfini.wallet.views.projection.generators.holding;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ArchivedEvent;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.DamlRecord;
import com.daml.ledger.javaapi.data.Event;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.Util;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.HoldingEvent;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.holding.base.LockType;
import daml.finance.interface$.holding.base.View;

import java.math.BigDecimal;
import java.sql.Connection;
import java.util.*;

public class HoldingsProjectionGenerator implements ProjectionGenerator<Event, HoldingEvent> {
  private final String readAs;
  private final Connection connection;

  public HoldingsProjectionGenerator(String readAs, Connection connection) {
    this.readAs = readAs;
    this.connection = connection;
  }

  @Override
  public BatchSource<Event> source(GrpcClientSettings grpcClientSettings) {
    return BatchSource.events(grpcClientSettings);
  }

  @Override
  public Projection<Event> projection() {
    return Projection.create(
      new ProjectionId("holdings-projection-for-" + readAs),
      ProjectionFilter.singleContractType(
        Set.of(readAs),
        Base.INTERFACE
      )
    );
  }

  @Override
  public Project<Event, HoldingEvent> project() {
    return envelope -> {
      final var event = envelope.getEvent();
      if (event instanceof CreatedEvent) {
        final CreatedEvent createdEvent = (CreatedEvent) event;
        final var view = Util.getView(createdEvent, Base.INTERFACE.TEMPLATE_ID, View.valueDecoder());
        if (
          view.isPresent() &&
          createdEvent.getSignatories().containsAll(List.of(view.get().account.custodian, view.get().account.owner))
        ) {
          return List.of(
            new HoldingEvent(
              event.getContractId(),
              envelope.getOffset(),
              envelope.getLedgerEffectiveTime(),
              view
            )
          );
        }
      } else if (event instanceof ArchivedEvent) {
        return List.of(
          new HoldingEvent(
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
  public BatchRows<HoldingEvent, JdbcAction> batchRows() {
    final var holdingsTable = new ProjectionTable("holdings");
    final var bindHoldings = Sql.<HoldingEvent>binder(
      "INSERT INTO " + holdingsTable.getName() + "\n" +
      "        (account_id,  account_custodian,  account_owner,  instrument_depository,  instrument_id,  instrument_issuer,  instrument_version,  amount,   lock_type,              lockers,  lock_context,  cid,  create_offset,  create_effective_time)\n" +
      "VALUES (:account_id, :account_custodian, :account_owner, :instrument_depository, :instrument_id, :instrument_issuer, :instrument_version, :amount, (:lock_type)::lock_type, :lockers, :lock_context, :cid, :create_offset, :create_effective_time)\n" +
      "ON CONFLICT(cid) DO UPDATE SET\n" +
      "  archive_offset = CASE WHEN :update_archive_offset THEN :archive_offset ELSE " + holdingsTable.getName() + ".archive_offset END,\n" +
      "  archive_effective_time = CASE WHEN :update_archive_effective_time THEN :archive_effective_time ELSE " + holdingsTable.getName() + ".archive_effective_time END"
    )
    .bind("account_id", e -> e.view.map(v -> v.account.id.unpack).orElse(""), Bind.String())
    .bind("account_custodian", e -> e.view.map(v -> v.account.custodian).orElse(""), Bind.String())
    .bind("account_owner", e -> e.view.map(v -> v.account.owner).orElse(""), Bind.String())
    .bind("instrument_depository", e -> e.view.map(v -> v.instrument.depository).orElse(""), Bind.String())
    .bind("instrument_id", e -> e.view.map(v -> v.instrument.id.unpack).orElse(""), Bind.String())
    .bind("instrument_issuer", e -> e.view.map(v -> v.instrument.issuer).orElse(""), Bind.String())
    .bind("instrument_version", e -> e.view.map(v -> v.instrument.version).orElse(""), Bind.String())
    .bind("amount", e -> e.view.map(v -> v.amount).orElse(new BigDecimal(0)), Bind.BigDecimal())
    .bind("lock_type", e -> e.view.flatMap(v -> v.lock).map(l -> lockTypeToString(l.lockType)), Bind.Optional(Bind.String()))
    .bind("lockers", e -> Util.setToArray(e.view.flatMap(v -> v.lock).map(l -> l.lockers), connection), Bind.Array())
    .bind("lock_context", e -> Util.setToArray(e.view.flatMap(v -> v.lock).map(l -> l.context), connection), Bind.Array())
    .bind("cid", e -> e.contractId, Bind.String())
    .bind("create_offset", e -> e.offset.map(Offset::getValue), Bind.Optional(Bind.String()))
    .bind("create_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()))
    .bind("update_archive_offset",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_offset", e -> e.offset.map(Offset::getValue), Bind.Optional(Bind.String()))
    .bind("update_archive_effective_time",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()));

    return UpdateMany.create(bindHoldings);
  }

  private static String lockTypeToString(LockType lockType) {
    if (lockType.equals(LockType.SEMAPHORE)) {
      return "semaphore";
    } else {
      return "reentrant";
    }
  }
}
