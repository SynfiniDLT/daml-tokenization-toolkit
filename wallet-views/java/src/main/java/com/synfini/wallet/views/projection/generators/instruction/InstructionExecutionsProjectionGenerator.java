package com.synfini.wallet.views.projection.generators.instruction;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ExercisedEvent;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.InstructionExecutionEvent;
import daml.finance.interface$.settlement.instruction.Instruction;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

public class InstructionExecutionsProjectionGenerator implements ProjectionGenerator<ExercisedEvent, InstructionExecutionEvent> {
  private final String readAs;

  public InstructionExecutionsProjectionGenerator(String readAs) {
    this.readAs = readAs;
  }

  @Override
  public BatchSource<ExercisedEvent> source(GrpcClientSettings grpcClientSettings) {
    return BatchSource.exercisedEvents(grpcClientSettings);
  }

  @Override
  public Projection<ExercisedEvent> projection() {
    return Projection.create(
      new ProjectionId("instruction-executions-projection-for-" + readAs),
      ProjectionFilter.parties(Set.of(readAs))
    );
  }

  @Override
  public Project<ExercisedEvent, InstructionExecutionEvent> project() {
    return envelope -> {
      final var exercisedEvent = envelope.getEvent();
      if (Optional.of(Instruction.TEMPLATE_ID).equals(exercisedEvent.getInterfaceId()) &&
        Instruction.CHOICE_Execute.name.equals(exercisedEvent.getChoice())) {
        return Collections.singletonList(
          new InstructionExecutionEvent(exercisedEvent.getContractId())
        );
      }
      return Collections.emptyList();
    };
  }

  @Override
  public BatchRows<InstructionExecutionEvent, JdbcAction> batchRows() {
    final var table = new ProjectionTable("instruction_executions");
    final var binder = Sql.<InstructionExecutionEvent>binder(
      "INSERT INTO " + table.getName() +
      "        (instruction_cid) " +
      "VALUES (:instruction_cid) " +
      "ON CONFLICT(instruction_cid) DO NOTHING"
    )
    .bind("instruction_cid", e -> e.instructionCid, Bind.String());
    return UpdateMany.create(binder);
  }
}
