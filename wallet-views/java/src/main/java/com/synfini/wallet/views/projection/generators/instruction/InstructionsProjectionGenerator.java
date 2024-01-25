package com.synfini.wallet.views.projection.generators.instruction;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ArchivedEvent;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.DamlRecord;
import com.daml.ledger.javaapi.data.Event;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.Util;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.InstructionEvent;
import daml.finance.interface$.settlement.instruction.Instruction;
import daml.finance.interface$.settlement.instruction.View;

import java.math.BigDecimal;
import java.sql.Connection;
import java.util.*;

public class InstructionsProjectionGenerator implements ProjectionGenerator<Event, InstructionEvent> {
  private final String readAs;
  private final Connection connection;

  public InstructionsProjectionGenerator(String readAs, Connection connection) {
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
      new ProjectionId("instructions-projection-for-" + readAs),
      ProjectionFilter.singleContractType(
        Set.of(readAs),
        Instruction.INTERFACE
      )
    );
  }

  @Override
  public Project<Event, InstructionEvent> project() {
    return envelope -> {
      final var event = envelope.getEvent();
      if (event instanceof CreatedEvent) {
        final CreatedEvent createdEvent = (CreatedEvent) event;
        final var view = Util.getView(createdEvent, Instruction.TEMPLATE_ID, View.valueDecoder());
        if (view.isPresent()) {
          final var expectedSignatories = new HashSet<>(view.get().requestors.map.keySet());
          expectedSignatories.addAll(view.get().signedSenders.map.keySet());
          expectedSignatories.addAll(view.get().signedReceivers.map.keySet());
          if (createdEvent.getSignatories().containsAll(expectedSignatories)) {
            return List.of(
              new InstructionEvent(
                createdEvent.getContractId(),
                envelope.getOffset(),
                envelope.getLedgerEffectiveTime(),
                view
              )
            );
          }
        }
      } else if (event instanceof ArchivedEvent) {
        return List.of(
          new InstructionEvent(
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
  public BatchRows<InstructionEvent, JdbcAction> batchRows() {
    final var table = new ProjectionTable("instructions");
    final var defaultRequestors = new da.set.types.Set<String>(Collections.emptyMap());
    final var bind = Sql.<InstructionEvent>binder(
      "INSERT INTO " + table.getName() + "\n" +
      "        (batch_id,  requestors_hash,  requestors,  settlers,  instruction_id,  cid,  sender,  receiver,  custodian,  amount,  instrument_depository,  instrument_issuer,  instrument_id,  instrument_version,  allocation_pledge_cid,  allocation_credit_receiver,  allocation_pass_through_from,  allocation_pass_through_from_account_id,  allocation_settle_off_ledger,  approval_account_id,  approval_pass_through_to,  approval_debit_sender,  approval_settle_off_ledger,  create_offset,  create_effective_time)\n" +
      "VALUES (:batch_id, :requestors_hash, :requestors, :settlers, :instruction_id, :cid, :sender, :receiver, :custodian, :amount, :instrument_depository, :instrument_issuer, :instrument_id, :instrument_version, :allocation_pledge_cid, :allocation_credit_receiver, :allocation_pass_through_from, :allocation_pass_through_from_account_id, :allocation_settle_off_ledger, :approval_account_id, :approval_pass_through_to, :approval_debit_sender, :approval_settle_off_ledger, :create_offset, :create_effective_time)\n" +
      "ON CONFLICT(cid) DO UPDATE SET\n" +
      "  archive_offset = CASE WHEN :update_archive_offset THEN :archive_offset ELSE " + table.getName() + ".archive_offset END,\n" +
      "  archive_effective_time = CASE WHEN :update_archive_effective_time THEN :archive_effective_time ELSE " + table.getName() + ".archive_effective_time END\n"
    )
    .bind("batch_id", e -> e.view.map(v -> v.batchId.unpack).orElse(""), Bind.String())
    .bind("requestors_hash", e -> e.view.map(v -> v.requestors).orElse(defaultRequestors).hashCode(), Bind.Int())
    .bind("requestors", e -> Util.setToArray(e.view.map(v -> v.requestors), connection), Bind.Array())
    .bind("settlers", e -> Util.setToArray(e.view.map(v -> v.settlers), connection), Bind.Array())
    .bind("instruction_id", e -> e.view.map(v -> v.id.unpack).orElse(""), Bind.String())
    .bind("cid", e -> e.contractId, Bind.String())
    .bind("sender", e -> e.view.map(v -> v.routedStep.sender).orElse(""), Bind.String())
    .bind("receiver", e -> e.view.map(v -> v.routedStep.receiver).orElse(""), Bind.String())
    .bind("custodian", e -> e.view.map(v -> v.routedStep.custodian).orElse(""), Bind.String())
    .bind("amount", e -> e.view.map(v -> v.routedStep.quantity.amount).orElse(new BigDecimal("0.0")), Bind.BigDecimal())
    .bind("instrument_depository", e -> e.view.map(v -> v.routedStep.quantity.unit.depository).orElse(""), Bind.String())
    .bind("instrument_issuer", e -> e.view.map(v -> v.routedStep.quantity.unit.issuer).orElse(""), Bind.String())
    .bind("instrument_id", e -> e.view.map(v -> v.routedStep.quantity.unit.id.unpack).orElse(""), Bind.String())
    .bind("instrument_version", e -> e.view.map(v -> v.routedStep.quantity.unit.version).orElse(""), Bind.String())
    .bind("allocation_pledge_cid", e -> e.getAllocationPledgeCid().map(cid -> cid.contractId), Bind.Optional(Bind.String()))
    .bind("allocation_credit_receiver", InstructionEvent::getAllocationCreditReceiver, Bind.Boolean())
    .bind("allocation_pass_through_from", e -> e.getAllocationPassThroughFrom().map(a -> a.tuple2Value._2.id.unpack), Bind.Optional(Bind.String()))
    .bind("allocation_pass_through_from_account_id", e -> e.getAllocationPassThroughFrom().map(a -> a.tuple2Value._1.id.unpack), Bind.Optional(Bind.String()))
    .bind("allocation_settle_off_ledger", InstructionEvent::getAllocationSettleOffLedger, Bind.Boolean())
    .bind("approval_account_id", e -> e.getApprovalAccount().map(a -> a.id.unpack), Bind.Optional(Bind.String()))
    .bind("approval_pass_through_to", e -> e.getApprovalPassThroughTo().map(a -> a.tuple2Value._2.id.unpack), Bind.Optional(Bind.String()))
    .bind("approval_debit_sender", InstructionEvent::getApprovalDebitSender, Bind.Boolean())
    .bind("approval_settle_off_ledger", InstructionEvent::getApprovalSettleOffLedger, Bind.Boolean())
    .bind("create_offset", e -> e.offset.map(o -> o.value()), Bind.Optional(Bind.String()))
    .bind("create_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()))
    .bind("update_archive_offset",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_offset", e -> e.offset.map(o -> o.value()), Bind.Optional(Bind.String()))
    .bind("update_archive_effective_time",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()));

    return UpdateMany.create(bind);
  }
}
