package com.synfini.wallet.views.projection.generators.witness;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.Event;
import com.daml.ledger.javaapi.data.codegen.ContractTypeCompanion;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.WitnessedEvent;

import java.util.Collection;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class WitnessProjectionGenerator implements ProjectionGenerator<Event, WitnessedEvent> {
  private final String readAs;
  private final String name;
  private final ContractTypeCompanion<?, ?, ?, ?> contractType;
  private final String tableName;

  public WitnessProjectionGenerator(
    String readAs,
    String name,
    ContractTypeCompanion<?, ?, ?, ?> contractType,
    String tableName
  ) {
    this.readAs = readAs;
    this.name = name;
    this.contractType = contractType;
    this.tableName = tableName;
  }

  @Override
  public BatchSource<Event> source(GrpcClientSettings grpcClientSettings) {
    return BatchSource.events(grpcClientSettings);
  }

  @Override
  public Projection<Event> projection() {
    return Projection.create(
      new ProjectionId(name + "-witnessed-projection-for-" + readAs),
      ProjectionFilter.singleContractType(Set.of(readAs), contractType)
    );
  }

  @Override
  public Project<Event, WitnessedEvent> project() {
    return envelope -> {
      final var event = envelope.getEvent();
      if (event instanceof CreatedEvent) {
        final var createdEvent = (CreatedEvent) event;
        final var informees = Stream.of(
          createdEvent.getWitnessParties(), createdEvent.getSignatories(), createdEvent.getObservers()
        );
        return informees
          .flatMap(Collection::stream)
          .distinct()
          .map(party -> new WitnessedEvent(createdEvent.getContractId(), party))
          .collect(Collectors.toList());
      } else {
        return Collections.emptyList();
      }
    };
  }

  @Override
  public BatchRows<WitnessedEvent, JdbcAction> batchRows() {
    final var table = new ProjectionTable(tableName);
    final var bind = Sql.<WitnessedEvent>binder(
      "INSERT INTO " + table.getName() + "\n" +
      "        (cid,  party)\n" +
      "VALUES (:cid, :party)\n" +
      "ON CONFLICT(cid, party) DO NOTHING "
    )
    .bind("cid", e -> e.contractId, Bind.String())
    .bind("party", e -> e.party, Bind.String());

    return UpdateMany.create(bind);
  }
}
