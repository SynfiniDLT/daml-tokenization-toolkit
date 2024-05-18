package com.synfini.wallet.views.schema.response;

import com.google.gson.JsonObject;
import com.synfini.wallet.views.schema.TransactionDetail;

public class HoldingSummary {
  String cid;
  JsonObject view;
  TransactionDetail create;

  public HoldingSummary(String cid, JsonObject view, TransactionDetail create) {
    this.cid = cid;
    this.view = view;
    this.create = create;
  }
}
