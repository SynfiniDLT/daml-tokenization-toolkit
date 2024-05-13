package com.synfini.wallet.views.schema.response;

import com.google.gson.JsonObject;

public class AccountSummary {
  String cid;
  JsonObject view;

  public AccountSummary(String cid, JsonObject view) {
    this.cid = cid;
    this.view = view;
  }
}
