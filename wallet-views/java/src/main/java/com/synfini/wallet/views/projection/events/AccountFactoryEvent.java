package com.synfini.wallet.views.projection.events;

import daml.finance.interface$.types.common.types.AccountKey;

import java.util.Optional;

public class AccountFactoryEvent {
  public final Optional<String> accountCid;
  public final AccountKey account;
  public final boolean isCreate;

  public AccountFactoryEvent(Optional<String> accountCid, AccountKey account, boolean isCreate) {
    this.accountCid = accountCid;
    this.account = account;
    this.isCreate = isCreate;
  }
}
