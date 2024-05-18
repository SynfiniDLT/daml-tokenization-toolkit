package com.synfini.wallet.views.schema;

import java.sql.Timestamp;

public class TransactionDetail {
  public String offset;
  public String effectiveTime;

  public TransactionDetail(String offset, Timestamp effectiveTime) {
    this.offset = offset;
    this.effectiveTime = effectiveTime.toInstant().toString();
  }
}
