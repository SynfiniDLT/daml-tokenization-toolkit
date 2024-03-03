package com.synfini.wallet.views.projection.events;

import com.daml.projection.Offset;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.settlement.instruction.View;
import daml.finance.interface$.settlement.types.allocation.CreditReceiver;
import daml.finance.interface$.settlement.types.allocation.PassThroughFrom;
import daml.finance.interface$.settlement.types.allocation.Pledge;
import daml.finance.interface$.settlement.types.allocation.SettleOffledger;
import daml.finance.interface$.settlement.types.approval.DebitSender;
import daml.finance.interface$.settlement.types.approval.PassThroughTo;
import daml.finance.interface$.settlement.types.approval.SettleOffledgerAcknowledge;
import daml.finance.interface$.settlement.types.approval.TakeDelivery;
import daml.finance.interface$.types.common.types.AccountKey;

import java.time.Instant;
import java.util.Optional;

public class InstructionEvent {
  public final String contractId;
  public final Optional<Offset> offset;
  public final Optional<Instant> effectiveTime;
  public final Optional<View> view;

  public InstructionEvent(
    String contractId,
    Optional<Offset> offset,
    Optional<Instant> effectiveTime,
    Optional<View> view
  ) {
    this.contractId = contractId;
    this.offset = offset;
    this.effectiveTime = effectiveTime;
    this.view = view;
  }

  public Optional<Base.ContractId> getAllocationPledgeCid() {
    return view.flatMap(v ->
      v.allocation instanceof Pledge ?
        Optional.of(((Pledge) v.allocation).contractIdValue) :
        Optional.empty()
    );
  }

  public boolean getAllocationCreditReceiver() {
    return view.map(v -> v.allocation instanceof CreditReceiver).orElse(false);
  }

  public Optional<PassThroughFrom> getAllocationPassThroughFrom() {
    return view.flatMap(v ->
      v.allocation instanceof PassThroughFrom ?
        Optional.of((PassThroughFrom) v.allocation) :
        Optional.empty()
    );
  }

  public boolean getAllocationSettleOffLedger() {
    return view.map(v -> v.allocation instanceof SettleOffledger).orElse(false);
  }

  public Optional<AccountKey> getApprovalAccount() {
    return view.flatMap(v -> {
      if (v.approval instanceof TakeDelivery) {
        return Optional.of(((TakeDelivery) v.approval).accountKeyValue);
      } else if (v.approval instanceof PassThroughTo) {
        return Optional.of(((PassThroughTo) v.approval).tuple2Value._1);
      } else {
        return Optional.empty();
      }
    });
  }

  public Optional<PassThroughTo> getApprovalPassThroughTo() {
    return view.flatMap(v ->
      v.approval instanceof PassThroughTo ? Optional.of((PassThroughTo) v.approval) : Optional.empty()
    );
  }

  public boolean getApprovalDebitSender() {
    return view.map(v -> v.approval instanceof DebitSender).orElse(false);
  }

  public boolean getApprovalSettleOffLedger() {
    return view.map(v -> v.approval instanceof SettleOffledgerAcknowledge).orElse(false);
  }
}
