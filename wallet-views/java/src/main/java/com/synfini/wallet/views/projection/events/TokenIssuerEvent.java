package com.synfini.wallet.views.projection.events;

import com.daml.projection.Offset;

import java.time.Instant;
import java.util.Optional;

public class TokenIssuerEvent {
  public final String contractId;
  public final Optional<Offset> offset;
  public final Optional<Instant> effectiveTime;
  public final Optional<synfini.interface$.onboarding.issuer.instrument.token.issuer.View> view;

  public TokenIssuerEvent(
    String contractId,
    Optional<Offset> offset,
    Optional<Instant> effectiveTime,
    Optional<synfini.interface$.onboarding.issuer.instrument.token.issuer.View>  view
  ) {
    this.contractId = contractId;
    this.offset = offset;
    this.effectiveTime = effectiveTime;
    this.view = view;
  }
}
