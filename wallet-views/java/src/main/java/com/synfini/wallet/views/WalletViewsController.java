package com.synfini.wallet.views;

import com.daml.ledger.javaapi.data.ListUserRightsResponse;
import com.daml.ledger.javaapi.data.User;
import com.daml.ledger.rxjava.DamlLedgerClient;
import com.daml.ledger.rxjava.LedgerClient;
import com.synfini.wallet.views.config.LedgerApiConfig;
import com.synfini.wallet.views.config.WalletViewsApiConfig;

import io.reactivex.functions.BiFunction;
import synfini.wallet.api.types.AccountFilter;
import synfini.wallet.api.types.AccountOpenOffersFilter;
import synfini.wallet.api.types.BalanceFilter;
import synfini.wallet.api.types.HoldingFilter;
import synfini.wallet.api.types.InstrumentsFilter;
import synfini.wallet.api.types.IssuersFilter;
import synfini.wallet.api.types.Result;
import synfini.wallet.api.types.SettlementsFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("wallet-views/v1")
public class WalletViewsController {
  private final WalletRepository walletRepository;
  private final WalletViewsApiConfig walletViewsApiConfig;
  private final LedgerApiConfig ledgerApiConfig;

  @Autowired
  public WalletViewsController(
    WalletRepository walletRepository,
    WalletViewsApiConfig walletViewsApiConfig,
    LedgerApiConfig ledgerApiConfig
  ) {
    this.walletRepository = walletRepository;
    this.walletViewsApiConfig = walletViewsApiConfig;
    this.ledgerApiConfig = ledgerApiConfig;
  }


  @GetMapping("")
  public ResponseEntity<String> get(){
    return ResponseEntity.ok("ok");
  }

  @PostMapping("/accounts")
  public ResponseEntity<Object> account(
    @RequestBody AccountFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var permittedReaders = new ArrayList<String>();
      filter.owner.ifPresent(permittedReaders::add);
      filter.custodian.ifPresent(permittedReaders::add);

      if (!canReadAsAnyOf(userRights, permittedReaders.toArray(new String[]{}))) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
      }
      final var accounts = walletRepository
        .accounts(filter.custodian, filter.owner, filter.id)
        .stream()
        .map(r -> r.unpack)
        .collect(Collectors.toList());
      return ResponseEntity.ok(new Result<>(accounts));
    });
  }

  @PostMapping("/account-open-offers")
  public ResponseEntity<Object> accountOpenOffers(
    @RequestBody AccountOpenOffersFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var parties = allParties(userRights);
      final var offers = walletRepository
        .accountOpenOffers(parties)
        .stream()
        .map(r -> r.unpack)
        .collect(Collectors.toList());
      return ResponseEntity.ok(new Result<>(offers));
    });
  }

  @PostMapping("/balance")
  public ResponseEntity<Object> balance(
    @RequestBody BalanceFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      if (!canReadAsAnyOf(userRights, filter.account.custodian, filter.account.owner)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
      }
      final var balances = walletRepository
        .balanceByAccount(filter.account)
        .stream()
        .map(r -> r.unpack)
        .collect(Collectors.toList());
      return ResponseEntity.ok(new Result<>(balances));
    });
  }

  @PostMapping("/holdings")
  public ResponseEntity<Object> holdings(
    @RequestBody HoldingFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var parties = allParties(userRights);
      final var holdings = walletRepository
        .holdings(filter.account, filter.instrument, parties)
        .stream()
        .map(r -> r.unpack)
        .collect(Collectors.toList());
      return ResponseEntity.ok(new Result<>(holdings));
    });
  }

  @PostMapping("/settlements")
  public ResponseEntity<Object> transactions(
    @RequestBody SettlementsFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (ledgerClient, userRights) -> {
      final var parties = allParties(userRights);
      final var limit = filter.limit.orElse(walletViewsApiConfig.maxTransactionsResponseSize);
      if (limit > walletViewsApiConfig.maxTransactionsResponseSize) {
        return ResponseEntity
          .badRequest()
          .body("Transactions limit cannot exceed " + walletViewsApiConfig.maxTransactionsResponseSize);
      }
      final var settlements = walletRepository
        .settlements(ledgerClient, parties, filter.batchId, filter.before, limit)
        .stream()
        .map(r -> r.unpack)
        .collect(Collectors.toList());
      return ResponseEntity.ok(
        new Result<>(settlements)
      );
    });
  }

  @PostMapping("/instruments")
  public ResponseEntity<Object> instruments(
    @RequestBody InstrumentsFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var parties = allParties(userRights);
      final var instruments = walletRepository
        .instruments(filter.depository, filter.issuer, filter.id, filter.version, parties)
        .stream()
        .map(r -> r.unpack)
        .collect(Collectors.toList());
      return ResponseEntity.ok(new Result<>(instruments));
    });
  }

  @PostMapping("/issuers")
  public ResponseEntity<Object> issuers(
    @RequestBody IssuersFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var parties = allParties(userRights);
      final var issuers = walletRepository
        .issuers(filter.depository, filter.issuer, parties)
        .stream()
        .map(r -> r.unpack)
        .collect(Collectors.toList());
      return ResponseEntity.ok(new Result<>(issuers));
    });
  }

  private static List<String> allParties(ListUserRightsResponse userRights) {
    return userRights
      .getRights()
      .stream()
      .flatMap(r -> {
        if (r instanceof User.Right.CanActAs) {
          return Stream.of(((User.Right.CanActAs) r).party);
        } else if (r instanceof User.Right.CanReadAs) {
          return Stream.of(((User.Right.CanReadAs) r).party);
        } else {
          return Stream.empty();
        }
      })
      .collect(Collectors.toList());
  }

  private static boolean canReadAsAnyOf(ListUserRightsResponse userRights, String... anyOf) {
    final var expectedParties = new HashSet<>();
    expectedParties.addAll(List.of(anyOf));

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

  private ResponseEntity<Object> withLedgerConnection(
    String auth,
    BiFunction<LedgerClient, ListUserRightsResponse, ResponseEntity<Object>> generateResponse
  ) throws Exception {
    DamlLedgerClient ledgerClient = null;

    try {
      final var token = LedgerUtil.getToken(auth);
      ledgerClient = LedgerUtil.connectToLedger(ledgerApiConfig, token);
      final var userRights = LedgerUtil.getUser(ledgerClient, LedgerUtil.getTokenSubject(token));
      return generateResponse.apply(ledgerClient, userRights);
    } finally {
      if (ledgerClient != null) {
        ledgerClient.close();
      }
    }
  }
}
