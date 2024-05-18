package com.synfini.wallet.views.schema.response;

import java.util.List;

public class Holdings {
  public List<HoldingSummary> holdings;

  public Holdings(List<HoldingSummary> holdings) {
    this.holdings = holdings;
  }
}
