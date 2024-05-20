package com.synfini.wallet.views.schema.response;

import java.util.List;

public class Issuers {
  public List<IssuerSummary> issuers;

  public Issuers(List<IssuerSummary> issuers) {
    this.issuers = issuers;
  }
}
