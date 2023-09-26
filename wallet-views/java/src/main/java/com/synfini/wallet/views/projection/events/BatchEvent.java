package com.synfini.wallet.views.projection.events;

import com.daml.projection.Offset;
import daml.finance.interface$.settlement.batch.View;

import java.time.Instant;
import java.util.Optional;

public class BatchEvent {
  public final String contractId;
  public final Optional<Offset> offset;
  public final Optional<Instant> effectiveTime;
  public final Optional<View> view;

  public BatchEvent(String contractId, Optional<Offset> offset, Optional<Instant> effectiveTime, Optional<View> view) {
    this.contractId = contractId;
    this.offset = offset;
    this.effectiveTime = effectiveTime;
    this.view = view;
  }
}
