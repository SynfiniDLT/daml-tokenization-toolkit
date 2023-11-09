package com.synfini.wallet.views;

import com.daml.ledger.javaapi.data.ListUserRightsResponse;
import com.daml.ledger.javaapi.data.User;
import com.daml.ledger.javaapi.data.codegen.DefinedDataType;
import com.daml.lf.codegen.json.JsonCodec;
import com.synfini.wallet.views.config.LedgerApiConfig;
import com.synfini.wallet.views.config.WalletViewsApiConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import synfini.wallet.api.types.*;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("wallet-views/v1")
public class WalletViewsController {
  private final WalletRepository walletRepository;
  private final WalletViewsApiConfig walletViewsApiConfig;
  private final LedgerApiConfig ledgerApiConfig;
  private static final JsonCodec jsonCodec = JsonCodec.apply(true, true);

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

  @PostMapping("/accounts")
  public ResponseEntity<String> account(
    @RequestBody AccountFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) {
    if (!WalletAuth.canReadAsAnyOf(ledgerApiConfig, auth, filter.owner)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    final var accounts = new Accounts(walletRepository.accountsByOwner(filter.owner));
    return ResponseEntity.ok(asJson(accounts));
  }

  @PostMapping("/balance")
  public ResponseEntity<String> balance(
    @RequestBody BalanceFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) {
    if (!WalletAuth.canReadAsAnyOf(ledgerApiConfig, auth, filter.account.custodian, filter.account.owner)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    final var balances = new Balances(walletRepository.balanceByAccount(filter.account));
    return ResponseEntity.ok(asJson(balances));
  }

  @PostMapping("/holdings")
  public ResponseEntity<String> holdings(
    @RequestBody HoldingFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) {
    final var userRights = WalletAuth.getUser(ledgerApiConfig, auth);
    final var parties = allParties(userRights);
    final var holdings = new Holdings(walletRepository.holdings(filter.account, filter.instrument, parties));
    return ResponseEntity.ok(asJson(holdings));
  }

  @PostMapping("/settlements")
  public ResponseEntity<String> transactions(
    @RequestBody SettlementsFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) {
    final var userRights = WalletAuth.getUser(ledgerApiConfig, auth);
    final var parties = allParties(userRights);
    final var limit = filter.limit.orElse(walletViewsApiConfig.maxTransactionsResponseSize);
    if (limit > walletViewsApiConfig.maxTransactionsResponseSize) {
      return ResponseEntity
        .badRequest()
        .body("Transactions limit cannot exceed " + walletViewsApiConfig.maxTransactionsResponseSize);
    }
    final var settlements = new Settlements(walletRepository.settlements(parties, filter.before, limit));
    return ResponseEntity.ok(asJson(settlements));
  }

  @PostMapping("/instruments")
  public ResponseEntity<String> instruments(
    @RequestBody InstrumentsFilter filter,
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, defaultValue = "") String auth
  ) {
    final var userRights = WalletAuth.getUser(ledgerApiConfig, auth);
    final var parties = allParties(userRights);
    final var instruments = new Instruments(
      walletRepository.instruments(filter.depository, filter.issuer, filter.id, filter.version, parties)
    );
    return ResponseEntity.ok(asJson(instruments));
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

  private static String asJson(DefinedDataType<?> damlPayload) {
    return jsonCodec.toJsValue(damlPayload.toValue()).compactPrint();
  }
}
