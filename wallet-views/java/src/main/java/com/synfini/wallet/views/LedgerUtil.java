// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

package com.synfini.wallet.views;

import com.daml.ledger.javaapi.data.ListUserRightsRequest;
import com.daml.ledger.javaapi.data.ListUserRightsResponse;
import com.daml.ledger.rxjava.DamlLedgerClient;
import com.daml.ledger.rxjava.LedgerClient;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.synfini.wallet.views.config.LedgerApiConfig;
import io.grpc.Status;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.*;
import io.grpc.netty.GrpcSslContexts;

public class LedgerUtil {
  private static final Logger logger = LoggerFactory.getLogger(LedgerUtil.class);
  private static final String invalidTokenMessage = "Authorization header does not contain a valid Jwt Bearer token";
  private static final Gson vanillaGson = new Gson();

  public static String getToken(String authHeader) {
    final var expectedPrefix = "Bearer ";
    if (authHeader == null || !authHeader.startsWith(expectedPrefix)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, invalidTokenMessage);
    }
    return authHeader.substring(expectedPrefix.length());
  }

  public static String getTokenSubject(String token) {
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
      parsedToken = vanillaGson.fromJson(new String(decoded, StandardCharsets.UTF_8), LedgerToken.class);
    } catch (JsonSyntaxException e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, invalidTokenMessage);
    }
    if (parsedToken.sub == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, invalidTokenMessage);
    }

    return parsedToken.sub;
  }

  public static DamlLedgerClient connectToLedger(LedgerApiConfig ledgerApiConfig, String token) {
    DamlLedgerClient client = null;
    try {
      final DamlLedgerClient.Builder clientBuilder = DamlLedgerClient
        .newBuilder(ledgerApiConfig.ledgerHost, ledgerApiConfig.ledgerPort)
        .withAccessToken(token);
      if (!Optional.ofNullable(ledgerApiConfig.ledgerPlaintext).orElse(false)) {
        clientBuilder.withSslContext(GrpcSslContexts.forClient().build());
      }
      client = clientBuilder.build();
      client.connect();
      return client;
    } catch (Throwable t) {
      final Status.Code grpcStatus = Status.fromThrowable(t).getCode();
      if (grpcStatus.equals(Status.UNAUTHENTICATED.getCode()) || grpcStatus.equals(Status.NOT_FOUND.getCode())) {
        logger.info("Unable to authenticate user", t);
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
      } else if (grpcStatus.equals(Status.UNAVAILABLE.getCode())) {
        logger.info("Ledger is unavailable", t);
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unavailable");
      } else {
        logger.error("Unexpected exception when connecting to ledger", t);
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");
      }
    }
  }

  public static ListUserRightsResponse getUser(LedgerClient client, String sub) {
    return client
      .getUserManagementClient()
      .listUserRights(new ListUserRightsRequest(sub))
      .blockingGet();
  }

  private static class LedgerToken {
    public String sub;
  }
}
