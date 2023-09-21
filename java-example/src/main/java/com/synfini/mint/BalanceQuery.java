package com.synfini.mint;

import com.daml.ledger.javaapi.data.*;
import com.daml.ledger.rxjava.LedgerClient;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.types.common.types.AccountKey;
import daml.finance.interface$.types.common.types.InstrumentKey;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

public class BalanceQuery {
  private final InstrumentKey instrument;
  private final AccountKey account;
  private final LedgerClient ledgerClient;

  private final AtomicReference<BigDecimal> balance;
  private final Map<String, BigDecimal> amounts; // map from Holding contract ID to amount on the contract

  public BalanceQuery(LedgerClient ledgerClient, InstrumentKey instrument, AccountKey account) {
    this.ledgerClient = ledgerClient;
    this.instrument = instrument;
    this.account = account;

    this.balance = new AtomicReference<>(new BigDecimal("0.0"));
    this.amounts = new ConcurrentHashMap<>();
  }

  public void initialise() {
    final var holdingsFilter = new FiltersByParty(
      Map.of(
        account.owner,
        new InclusiveFilter(
          Set.of(),
          Map.of(Base.TEMPLATE_ID, Filter.Interface.INCLUDE_VIEW)
        )
      )
    );
    final AtomicReference<Optional<String>> acsOffset = new AtomicReference<>(Optional.empty());

    ledgerClient
      .getActiveContractSetClient()
      .getActiveContracts(holdingsFilter, false)
      .blockingForEach(activeContractsResponse -> {
        for (final var createdEvent : activeContractsResponse.getCreatedEvents()) {
          addToBalance(createdEvent);
        }

        if (activeContractsResponse.getOffset().isPresent()) {
          acsOffset.set(activeContractsResponse.getOffset());
        }
      });

    final var streamBeginOffset = acsOffset.get().orElseThrow(() -> new IllegalStateException("ACS offset not present"));
    ledgerClient
      .getTransactionsClient()
      .getTransactions(new LedgerOffset.Absolute(streamBeginOffset), holdingsFilter, false)
      .forEach(transaction -> {
        for (final var event : transaction.getEvents()) {
          if (event instanceof CreatedEvent) {
            addToBalance((CreatedEvent) event);
          } else if (event instanceof ArchivedEvent) {
            final var amount = amounts.get(event.getContractId());
            if (amount != null) {
              balance.getAndUpdate(b -> b.subtract(amount));
              amounts.remove(event.getContractId());
            }
          }
        }
      });
  }

  public BigDecimal getBalance() {
    return this.balance.get();
  }

  private void addToBalance(CreatedEvent createdEvent) {
    final var holding = Base.INTERFACE.fromCreatedEvent(createdEvent);
    if (
      // The signatory check is needed in case someone creates their own templates using which they self-sign the
      // Holding, which would invalidate our balance calculation
      holding.signatories.containsAll(Set.of(account.owner, account.custodian)) &&
      // Check the holding is sitting in the right account and has the correct instrument
      holding.data.account.equals(account) &&
      holding.data.instrument.equals(instrument)
    ) {
      balance.getAndUpdate(b -> b.add(holding.data.amount));
      amounts.put(holding.id.contractId, holding.data.amount);
    }
  }
}
