package com.synfini.wallet.views.schema.response;

import com.google.gson.JsonObject;
import com.synfini.wallet.views.schema.TransactionDetail;

public class AccountOpenOfferSummary {
  public String cid;
  public JsonObject view;
  public TransactionDetail create;

  public AccountOpenOfferSummary(String cid, JsonObject view, TransactionDetail create) {
    this.cid = cid;
    this.view = view;
    this.create = create;
  }
}
