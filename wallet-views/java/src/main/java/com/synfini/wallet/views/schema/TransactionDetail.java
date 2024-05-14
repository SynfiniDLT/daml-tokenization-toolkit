package com.synfini.wallet.views.schema;

public class TransactionDetail {
  public String offset;
  public String effectiveTime;

  public TransactionDetail(String offset, String effectiveTime) {
    this.offset = offset;

    this.effectiveTime = effectiveTime;
  }
}
