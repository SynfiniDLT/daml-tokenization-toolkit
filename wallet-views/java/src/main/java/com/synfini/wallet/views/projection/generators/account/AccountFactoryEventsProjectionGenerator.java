package com.synfini.wallet.views.projection.generators.account;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ContractId;
import com.daml.ledger.javaapi.data.ExercisedEvent;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.AccountFactoryEvent;
import daml.finance.interface$.account.factory.Create;
import daml.finance.interface$.account.factory.Factory;
import daml.finance.interface$.account.factory.Remove;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

public class AccountFactoryEventsProjectionGenerator implements ProjectionGenerator<ExercisedEvent, AccountFactoryEvent> {
  private final String readAs;

  public AccountFactoryEventsProjectionGenerator(String readAs) {
    this.readAs = readAs;
  }

  @Override
  public BatchSource<ExercisedEvent> source(GrpcClientSettings grpcClientSettings) {
    return BatchSource.exercisedEvents(grpcClientSettings);
  }

  @Override
  public Projection<ExercisedEvent> projection() {
    return Projection.create(
      new ProjectionId("account-factory-projection-for-" + readAs),
      ProjectionFilter.parties(Set.of(readAs))
    );
  }

  @Override
  public Project<ExercisedEvent, AccountFactoryEvent> project() {
    return envelope -> {
      final var exercisedEvent = envelope.getEvent();
      if (Optional.of(Factory.TEMPLATE_ID).equals(exercisedEvent.getInterfaceId())) {
        if (Factory.CHOICE_Create.name.equals(exercisedEvent.getChoice())) {
          final var create = Create.valueDecoder().decode(exercisedEvent.getChoiceArgument());
          final var accountCid = (ContractId) exercisedEvent.getExerciseResult();
          return Collections.singletonList(
            new AccountFactoryEvent(Optional.of(accountCid.getValue()),
              create.account,
              true
            )
          );
        } else if (Factory.CHOICE_Remove.name.equals(exercisedEvent.getChoice())) {
          final var remove = Remove.valueDecoder().decode(exercisedEvent.getChoiceArgument());
          return Collections.singletonList(
            new AccountFactoryEvent(
              Optional.empty(),
              remove.account,
              false
            )
          );
        }
      }
      return Collections.emptyList();
    };
  }

  @Override
  public BatchRows<AccountFactoryEvent, JdbcAction> batchRows() {
    final var accountFactoryEventsTable = new ProjectionTable("account_factory_events");
    final Binder<AccountFactoryEvent> bindAccountEvents = Sql.<AccountFactoryEvent>binder(
      "INSERT INTO " + accountFactoryEventsTable.getName() +
      "      ( account_cid,  account_custodian,  account_owner,  account_id,  is_create)\n" +
      "VALUES(:account_cid, :account_custodian, :account_owner, :account_id, :is_create)\n" +
      "ON CONFLICT (account_cid) DO NOTHING"
    )
    .bind("account_cid", e -> e.accountCid, Bind.Optional(Bind.String()))
    .bind("account_custodian", e -> e.account.custodian, Bind.String())
    .bind("account_owner", e -> e.account.owner, Bind.String())
    .bind("account_id", e -> e.account.id.unpack, Bind.String())
    .bind("is_create", e -> e.isCreate, Bind.Boolean());
    return UpdateMany.create(bindAccountEvents);
  }
}
