package com.synfini.wallet.views.projection.events;

public class WitnessedEvent {
  public final String contractId;
  public final String party;

  public WitnessedEvent(String contractId, String party) {
    this.contractId = contractId;
    this.party = party;
  }
}
