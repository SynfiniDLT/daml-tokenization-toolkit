package com.synfini.wallet.views.projection.events;

import com.daml.projection.Offset;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.settlement.instruction.View;
import daml.finance.interface$.settlement.types.allocation.Pledge;
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

  public Optional<AccountKey> getApprovalTakeDeliveryAccount() {
    return view.flatMap(v ->
      v.approval instanceof TakeDelivery ?
        Optional.of(((TakeDelivery) v.approval).accountKeyValue) :
        Optional.empty()
    );
  }
}
