package com.synfini.wallet.views.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LedgerApiConfig {
  @Value("${walletviews.ledger-host}")
  public String ledgerHost;

  @Value("${walletviews.ledger-port}")
  public Integer ledgerPort;

  @Value("${walletviews.ledger-plaintext}")
  public boolean ledgerPlaintext;
}
