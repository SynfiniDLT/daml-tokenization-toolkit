package com.synfini.mint;

import com.daml.ledger.javaapi.data.*;
import com.daml.ledger.rxjava.DamlLedgerClient;
import daml.finance.interface$.holding.base.Base;
import io.grpc.netty.NettyChannelBuilder;
import synfini.mint.BurnInstruction;
import synfini.mint.MintInstruction;

import java.util.Map;
import java.util.Set;

public class Application {
  public static void main(String[] args) {
    final var ledgerHost = args[0];
    final int ledgerPort = Integer.parseInt(args[1]);
    final var minterBurner = args[2];
    final var readAs = args[3];
    final var appId = "MintApp"; // TODO this should be configurable (for an authenticated ledger this must be equal to the userId)

    final var channelBuilder = NettyChannelBuilder.forAddress(ledgerHost, ledgerPort);
    // TODO you can update the channel builder to use TLS or change other settings
    final var ledgerClient = DamlLedgerClient.newBuilder(channelBuilder).build();
    ledgerClient.connect();

    final var filter = new FiltersByParty(
      Map.of(
        minterBurner,
        new InclusiveFilter(
          Set.of(MintInstruction.TEMPLATE_ID, BurnInstruction.TEMPLATE_ID),
          Map.of(Base.TEMPLATE_ID, Filter.Interface.INCLUDE_VIEW)
        )
      )
    );

    ledgerClient
      .getTransactionsClient()
      .getTransactions(LedgerOffset.LedgerEnd.getInstance(), filter, false)
      .blockingSubscribe(new MintRequestSubscriber(ledgerClient, appId, minterBurner, readAs));
  }
}
