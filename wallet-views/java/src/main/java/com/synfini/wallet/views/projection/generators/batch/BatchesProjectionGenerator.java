package com.synfini.wallet.views.projection.generators.batch;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ArchivedEvent;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.Event;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.Util;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.BatchEvent;
import daml.finance.interface$.settlement.batch.Batch;
import daml.finance.interface$.settlement.batch.View;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public class BatchesProjectionGenerator implements ProjectionGenerator<Event, BatchEvent> {
  private final String readAs;
  private final Connection connection;

  public BatchesProjectionGenerator(String readAs, Connection connection) {
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
      new ProjectionId("batches-projection-for-" + readAs),
      ProjectionFilter.singleContractType(
        Set.of(readAs),
        Batch.INTERFACE
      )
    );
  }

  @Override
  public Project<Event, BatchEvent> project() {
    return envelope -> {
      final var event = envelope.getEvent();
      if (event instanceof CreatedEvent) {
        final var createdEvent = (CreatedEvent) event;
        final var view = Util.getView(createdEvent, Batch.INTERFACE.TEMPLATE_ID, View.valueDecoder());
        if (
          view.isPresent() &&
          createdEvent.getSignatories().containsAll(view.get().requestors.map.keySet())) {
          return List.of(
            new BatchEvent(
              event.getContractId(),
              envelope.getOffset(),
              envelope.getLedgerEffectiveTime(),
              view
            )
          );
        }
      } else if (event instanceof ArchivedEvent) {
        return List.of(
          new BatchEvent(
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
  public BatchRows<BatchEvent, JdbcAction> batchRows() {
    final var table = new ProjectionTable("batches");
    final var defaultRequesters = new da.set.types.Set<String>(Collections.emptyMap());
    final var bind = Sql.<BatchEvent>binder(
      "INSERT INTO " + table.getName() + "\n" +
      "        (batch_id,  requestors_hash,  requestors,  cid,  description,  context_id,  create_offset,  create_effective_time)\n" +
      "VALUES (:batch_id, :requestors_hash, :requestors, :cid, :description, :context_id, :create_offset, :create_effective_time)\n" +
      "ON CONFLICT(cid) DO UPDATE SET\n" +
      "  archive_offset = CASE WHEN :update_archive_offset THEN :archive_offset ELSE " + table.getName() + ".archive_offset END,\n" +
      "  archive_effective_time = CASE WHEN :update_archive_effective_time THEN :archive_effective_time ELSE " + table.getName() + ".archive_effective_time END\n"
    )
    .bind("batch_id", e -> e.view.map(v -> v.id.unpack).orElse(""), Bind.String())
    .bind("requestors_hash", e -> e.view.map(v -> v.requestors).orElse(defaultRequesters).hashCode(), Bind.Int())
    .bind("requestors", e -> Util.setToArray(e.view.map(v -> v.requestors), connection), Bind.Array())
    .bind("cid", e -> e.contractId, Bind.String())
    .bind("description", e -> e.view.map(v -> v.description).orElse(""), Bind.String())
    .bind("context_id", e -> e.view.flatMap(v -> v.contextId).map(i -> i.unpack), Bind.Optional(Bind.String()))
    .bind("create_offset", e -> e.offset.map(Offset::getValue), Bind.Optional(Bind.String()))
    .bind("create_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()))
    .bind("update_archive_offset", e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_offset", e -> e.offset.map(Offset::getValue), Bind.Optional(Bind.String()))
    .bind("update_archive_effective_time", e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()));

    return UpdateMany.create(bind);
  }
}
