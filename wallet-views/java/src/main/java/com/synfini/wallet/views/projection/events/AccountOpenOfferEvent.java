package com.synfini.wallet.views.projection.events;

import com.daml.projection.Offset;
import synfini.interface$.onboarding.account.openoffer.openoffer.View;

import java.time.Instant;
import java.util.Optional;

public class AccountOpenOfferEvent {
  public final String contractId;
  public final Optional<Offset> offset;
  public final Optional<Instant> effectiveTime;
  public final Optional<View> view;

  public AccountOpenOfferEvent(String contractId, Optional<Offset> offset, Optional<Instant> effectiveTime, Optional<View> view) {
    this.contractId = contractId;
    this.offset = offset;
    this.effectiveTime = effectiveTime;
    this.view = view;
  }
}
