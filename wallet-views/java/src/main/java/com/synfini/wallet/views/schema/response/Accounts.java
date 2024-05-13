package com.synfini.wallet.views.schema.response;

import java.util.List;

public class Accounts {
  public List<AccountSummary> accounts;

  public Accounts(List<AccountSummary> accounts) {
    this.accounts = accounts;
  }
}
