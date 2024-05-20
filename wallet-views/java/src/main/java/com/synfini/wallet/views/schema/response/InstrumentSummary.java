package com.synfini.wallet.views.schema.response;

import com.google.gson.JsonObject;

public class InstrumentSummary {
  public String cid;
  public JsonObject tokenView;

  public InstrumentSummary(String cid, JsonObject tokenView) {
    this.cid = cid;
    this.tokenView = tokenView;
  }
}
