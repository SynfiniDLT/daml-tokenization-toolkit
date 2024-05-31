package com.synfini.wallet.views;

import com.daml.ledger.javaapi.data.ListUserRightsResponse;
import com.daml.ledger.javaapi.data.User;
import com.daml.ledger.rxjava.DamlLedgerClient;
import com.daml.ledger.rxjava.LedgerClient;
import com.google.gson.JsonObject;
import com.synfini.wallet.views.config.LedgerApiConfig;
import com.synfini.wallet.views.config.WalletViewsApiConfig;
import com.synfini.wallet.views.schema.response.Holdings;
import com.synfini.wallet.views.schema.response.Instruments;
import com.synfini.wallet.views.schema.response.Issuers;

import io.reactivex.functions.BiFunction;
import synfini.wallet.api.types.AccountsRaw;
import synfini.wallet.api.types.AccountFilter;
import synfini.wallet.api.types.AccountOpenOffersFilter;
import synfini.wallet.api.types.AccountOpenOffersRaw;
import synfini.wallet.api.types.BalanceFilter;
import synfini.wallet.api.types.BalancesRaw;
import synfini.wallet.api.types.BalancesTyped;
import synfini.wallet.api.types.HoldingFilter;
import synfini.wallet.api.types.InstrumentsFilter;
import synfini.wallet.api.types.IssuersFilter;
import synfini.wallet.api.types.SettlementsFilter;
import synfini.wallet.api.types.SettlementsRaw;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.SQLException;
import java.util.ArrayList;
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
      final var permittedReaders = new ArrayList<>();
      permittedReaders.add(filter.owner);
      filter.custodian.ifPresent(permittedReaders::add);

      if (
        !WalletAuth.canReadAsAnyOf(userRights, permittedReaders.toArray(new String[]{}))
      ) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
      }
      final var accounts = new AccountsRaw<>(walletRepository.accounts(filter.custodian, filter.owner));
      return ResponseEntity.ok(accounts);
    });
  }

  @PostMapping("/account-open-offers")
  public ResponseEntity<Object> accountOpenOffers(
    @RequestBody AccountOpenOffersFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var parties = allParties(userRights);
      final var offers = new AccountOpenOffersRaw<>(walletRepository.accountOpenOffers(parties));
      return ResponseEntity.ok(offers);
    });
  }

  @PostMapping("/balance")
  public ResponseEntity<Object> balance(
    @RequestBody BalanceFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      if (!WalletAuth.canReadAsAnyOf(userRights, filter.account.custodian, filter.account.owner)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
      }
      final var balances = new BalancesRaw(walletRepository.balanceByAccount(filter.account));
      return ResponseEntity.ok(balances);
    });
  }

  @PostMapping("/holdings")
  public ResponseEntity<Object> holdings(
    @RequestBody HoldingFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var parties = allParties(userRights);
      final var holdings = new Holdings(walletRepository.holdings(filter.account, filter.instrument, parties));
      return ResponseEntity.ok(holdings);
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
      try {
        final var settlements = walletRepository.settlements(ledgerClient, parties, filter.before, limit);
        return ResponseEntity.ok(
          new SettlementsRaw<JsonObject>(settlements)
        );
      } catch (SQLException e) {
        Util.logger.error("Error reading settlements", e);
        return ResponseEntity.internalServerError().body("Internal server error");
      }
    });
  }

  @PostMapping("/instruments")
  public ResponseEntity<Object> instruments(
    @RequestBody InstrumentsFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var parties = allParties(userRights);
      final var instruments = new Instruments(
        walletRepository.instruments(filter.depository, filter.issuer, filter.id, filter.version, parties)
      );
      return ResponseEntity.ok(instruments);
    });
  }

  @PostMapping("/issuers")
  public ResponseEntity<Object> issuers(
    @RequestBody IssuersFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) throws Exception {
    return withLedgerConnection(auth, (__, userRights) -> {
      final var parties = allParties(userRights);
      final var instruments = new Issuers(walletRepository.issuers(filter.depository, filter.issuer, parties));
      return ResponseEntity.ok(Util.gson.toJson(instruments));
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

  private ResponseEntity<Object> withLedgerConnection(
    String auth,
    BiFunction<LedgerClient, ListUserRightsResponse, ResponseEntity<Object>> generateResponse
  ) throws Exception {
    DamlLedgerClient ledgerClient = null;

    try {
      final var token = WalletAuth.getToken(auth);
      ledgerClient = WalletAuth.connectToLedger(ledgerApiConfig, token);
      final var userRights = WalletAuth.getUser(ledgerClient, WalletAuth.getTokenSubject(token));
      return generateResponse.apply(ledgerClient, userRights);
    } finally {
      if (ledgerClient != null) {
        ledgerClient.close();
      }
    }
  }
}
