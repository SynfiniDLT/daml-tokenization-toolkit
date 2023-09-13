package com.synfini.wallet.views.projection.events;

import com.daml.projection.Offset;
import synfini.interface$.instrument.partyboundattributes.instrument.View;

import java.time.Instant;
import java.util.Optional;

public class TokenInstrumentEvent {
  public final String contractId;
  public final Optional<Offset> offset;
  public final Optional<Instant> effectiveTime;
  public final Optional<synfini.interface$.instrument.partyboundattributes.instrument.View> pbtView;
  public final Optional<daml.finance.interface$.instrument.token.instrument.View> view;

  public TokenInstrumentEvent(
    String contractId,
    Optional<Offset> offset,
    Optional<Instant> effectiveTime,
    Optional<View> pbtView,
    Optional<daml.finance.interface$.instrument.token.instrument.View> view
  ) {
    this.contractId = contractId;
    this.offset = offset;
    this.effectiveTime = effectiveTime;
    this.pbtView = pbtView;
    this.view = view;
  }
}
