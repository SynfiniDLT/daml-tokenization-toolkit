package com.synfini.wallet.views.schema.response;

import java.util.List;

public class AccountOpenOffers {
  public List<AccountOpenOfferSummary> accountOpenOffers;

  public AccountOpenOffers(List<AccountOpenOfferSummary> accountOpenOffers) {
    this.accountOpenOffers = accountOpenOffers;
  }
}
