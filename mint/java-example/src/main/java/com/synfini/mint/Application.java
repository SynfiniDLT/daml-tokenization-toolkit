package com.synfini.mint;

import com.daml.ledger.rxjava.DamlLedgerClient;
import io.grpc.netty.NettyChannelBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Application {
  private static final Logger logger = LoggerFactory.getLogger(Application.class);

  public static void main(String[] args) {
    final var ledgerHost = args[0];
    final int ledgerPort = Integer.parseInt(args[1]);
    final var minterBurner = args[2];
    final var readAs = minterBurner; // TODO can add support for another read-as party
    final var appId = "MintApp"; // TODO this should be configurable (for an authenticated ledger this must be equal to the userId)

    final var channelBuilder = NettyChannelBuilder.forAddress(ledgerHost, ledgerPort);
    // TODO you can update the channel builder to use TLS or change other settings
    final var ledgerClient = DamlLedgerClient.newBuilder(channelBuilder).build();
    logger.info("Connecting to the ledger");
    ledgerClient.connect();

    logger.info("Starting bot");
    new MinterBurnerBot(ledgerClient, appId, minterBurner, readAs).blockingExecute();
  }
}
