package com.synfini.wallet.views.schema.response;

import java.util.List;

public class Instruments {
  public List<InstrumentSummary> instruments;

  public Instruments(List<InstrumentSummary> instruments) {
    this.instruments = instruments;
  }
}
