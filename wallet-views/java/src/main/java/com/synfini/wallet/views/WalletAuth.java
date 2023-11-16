package com.synfini.wallet.views;

import com.daml.ledger.javaapi.data.ListUserRightsRequest;
import com.daml.ledger.javaapi.data.ListUserRightsResponse;
import com.daml.ledger.javaapi.data.User;
import com.daml.ledger.rxjava.DamlLedgerClient;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.synfini.wallet.views.config.LedgerApiConfig;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.netty.handler.ssl.SslContextBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.*;

public class WalletAuth {
  private static final Logger logger = LoggerFactory.getLogger(WalletAuth.class);

  public static ListUserRightsResponse getUser(LedgerApiConfig ledgerApiConfig, String authHeader) {
    final var expectedPrefix = "Bearer ";
    final var invalidTokenMessage = "Authorization header does not contain a valid Jwt Bearer token";
    if (authHeader == null || !authHeader.startsWith(expectedPrefix)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, invalidTokenMessage);
    }
    final var token = authHeader.substring(expectedPrefix.length());
    final String[] splitted = token.split("\\.");
    if (splitted.length != 3) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, invalidTokenMessage);
    }
    final byte[] decoded;
    try {
      decoded = Base64.getUrlDecoder().decode(splitted[1]);
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, invalidTokenMessage);
    }
    final LedgerToken parsedToken;
    try {
      parsedToken = new Gson().fromJson(new String(decoded, StandardCharsets.UTF_8), LedgerToken.class);
    } catch (JsonSyntaxException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, invalidTokenMessage);
    }
    if (parsedToken.sub == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, invalidTokenMessage);
    }

    DamlLedgerClient client = null;
    boolean result = false;
    com.daml.ledger.javaapi.data.ListUserRightsResponse userRights;
    try {
      logger.info("LedgerHost=", ledgerApiConfig.ledgerHost);
      logger.info("LedgerPort=", ledgerApiConfig.ledgerPort);
      logger.info("token=", token);
      final DamlLedgerClient.Builder clientBuilder = DamlLedgerClient
        .newBuilder(ledgerApiConfig.ledgerHost, ledgerApiConfig.ledgerPort)
        .withAccessToken(token);
      if (!Optional.ofNullable(ledgerApiConfig.ledgerPlaintext).orElse(false)) {
        clientBuilder.withSslContext(SslContextBuilder.forClient().build());
      }
      client = clientBuilder.build();
      client.connect();
      userRights = client
        .getUserManagementClient()
        .listUserRights(new ListUserRightsRequest(parsedToken.sub))
        .blockingGet();
    } catch (Throwable t) {
      final Status.Code grpcStatus = Status.fromThrowable(t).getCode();
      if (grpcStatus.equals(Status.UNAUTHENTICATED.getCode()) || grpcStatus.equals(Status.NOT_FOUND.getCode())) {
        logger.info("Unable to authenticate user", t);
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
      } else if (grpcStatus.equals(Status.UNAVAILABLE.getCode())) {
        logger.info("Ledger is unavailable", t);
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unavailable");
      } else {
        logger.error("Unexpected exception when getting user rights", t);
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");
      }
    } finally {
      if (client != null) {
        try {
          client.close();
        } catch (Exception e) {
          logger.warn("Error closing ledger API client", e);
        }
      }
    }

    return userRights;
  }

  public static boolean canReadAsAnyOf(LedgerApiConfig ledgerApiConfig, String authHeader, String... anyOf) {
    final var expectedParties = new HashSet<>();
    expectedParties.addAll(List.of(anyOf));

    final var userRights = getUser(ledgerApiConfig, authHeader);
    for (final User.Right right : userRights.getRights()) {
      String party;
      if (right instanceof User.Right.CanActAs) {
        party = ((User.Right.CanActAs) right).party;
      } else if (right instanceof User.Right.CanReadAs) {
        party = ((User.Right.CanReadAs) right).party;
      } else {
        continue;
      }
      if (expectedParties.contains(party)) {
        return true;
      }
    }

    return false;
  }

  private static class LedgerToken {
    public String sub;
  }
}
