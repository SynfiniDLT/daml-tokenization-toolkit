package com.synfini.wallet.views.schema.response;

import com.google.gson.JsonObject;

public class TokenIssuerSummary {
  public String cid;
  public JsonObject view;

  public TokenIssuerSummary(String cid, JsonObject view) {
    this.cid = cid;
    this.view = view;
  }
}
