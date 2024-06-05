package com.synfini.wallet.views;

import com.daml.ledger.api.v1.admin.PackageManagementServiceGrpc;
import com.daml.ledger.api.v1.admin.PackageManagementServiceOuterClass;
import com.daml.ledger.api.v1.admin.PartyManagementServiceGrpc;
import com.daml.ledger.api.v1.admin.PartyManagementServiceOuterClass;
import com.daml.ledger.javaapi.data.*;
import com.daml.ledger.javaapi.data.codegen.DefinedDataType;
import com.daml.ledger.javaapi.data.codegen.HasCommands;
import com.daml.ledger.javaapi.data.codegen.Update;
import com.daml.ledger.rxjava.DamlLedgerClient;
import com.daml.lf.codegen.json.JsonCodec;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.protobuf.ByteString;
import da.internal.template.Archive;
import da.set.types.Set;
import da.types.Tuple2;
import daml.finance.interface$.account.account.Account;
import daml.finance.interface$.account.account.Controllers;
import daml.finance.interface$.account.account.Credit;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.holding.base.Lock;
import daml.finance.interface$.holding.base.LockType;
import daml.finance.interface$.holding.base.View;
import daml.finance.interface$.holding.fungible.Fungible;
import daml.finance.interface$.holding.fungible.SplitResult;
import daml.finance.interface$.instrument.token.types.Token;
import daml.finance.interface$.settlement.batch.Batch;
import daml.finance.interface$.settlement.factory.Instruct;
import daml.finance.interface$.settlement.instruction.Instruction;
import daml.finance.interface$.settlement.types.Allocation;
import daml.finance.interface$.settlement.types.Approval;
import daml.finance.interface$.settlement.types.InstructionKey;
import daml.finance.interface$.settlement.types.RoutedStep;
import daml.finance.interface$.settlement.types.allocation.*;
import daml.finance.interface$.settlement.types.approval.*;
import daml.finance.interface$.types.common.types.AccountKey;
import daml.finance.interface$.types.common.types.Id;
import daml.finance.interface$.types.common.types.InstrumentKey;
import daml.finance.interface$.types.common.types.Quantity;
import io.grpc.MethodDescriptor;
import io.grpc.*;
import io.grpc.netty.NettyChannelBuilder;
import org.apache.ibatis.jdbc.ScriptRunner;
import org.junit.jupiter.api.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.testcontainers.containers.PostgreSQLContainer;

import synfini.wallet.api.types.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.lang.ProcessBuilder.Redirect;
import java.math.BigDecimal;
import java.net.ServerSocket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
  webEnvironment = SpringBootTest.WebEnvironment.MOCK,
  classes = SpringApplication.class)
@AutoConfigureMockMvc
public class IntegrationTest {
  private static final String walletViewsBasePath = "/wallet-views/v1/";
  private static final Logger logger = LoggerFactory.getLogger(IntegrationTest.class);
  private static final String tokenAudience =
    "https://daml.com/jwt/aud/participant/sandbox::1220facc0504d0689c876c616736695a92dbdd54a2aad49cc7a8b2f54935604c35ac";
  private static final JsonCodec jsonCodec = JsonCodec.apply(true, true);

  private static Integer sandboxPort;
  private static Process sandboxProcess;
  private static Process scribeProcess;
  private static PostgreSQLContainer<?> postgresContainer;
  private static ManagedChannel allPartiesChannel;
  private static ManagedChannel adminChannel;
  private static DamlLedgerClient allPartiesLedgerClient;

  private static String depository;
  private static String issuer;
  private static String custodian;
  private static String custodianUser;
  private static String investor1;
  private static String investor1User;
  private static String investor2;
  private static String investor2User;
  private static String issuerUser;
  private static String allPartiesUser;

  private static daml.finance.interface$.account.factory.Factory.ContractId accountFactoryCid;
  private static synfini.interface$.onboarding.account.openoffer.factory.Factory.ContractId accountOpenOfferFactoryCid;
  private static daml.finance.interface$.holding.factory.Factory.ContractId holdingFactoryCid;
  private static daml.finance.interface$.settlement.factory.Factory.ContractId settlementFactoryCid;
  private static daml.finance.interface$.instrument.token.factory.Factory.ContractId tokenInstrumentFactoryCid;
  private static synfini.interface$.onboarding.issuer.instrument.token.factory.Factory.ContractId tokenInstrumentIssuerFactoryCid;

  @Autowired
  private MockMvc mvc;

  @BeforeAll
  public static void beforeAll() throws Exception {
    System.setProperty("projection.flyway.migrate-on-start", "true");
    postgresContainer = new PostgreSQLContainer<>("postgres:16");
    postgresContainer.start();

    System.setProperty("spring.datasource.url", postgresContainer.getJdbcUrl());
    System.setProperty("spring.datasource.username", postgresContainer.getUsername());
    System.setProperty("spring.datasource.password", postgresContainer.getPassword());
    System.setProperty("spring.datasource.driver-class-name", postgresContainer.getDriverClassName());

    Integer adminApiPort, domainPublicPort, domainAdminPort;
    ServerSocket socket = null, adminApiSocket = null, domainPublicSocket = null, domainAdminSocket = null;
    try {
      socket = new ServerSocket(0);
      sandboxPort = socket.getLocalPort();
      System.setProperty("walletviews.ledger-port", sandboxPort.toString());

      adminApiSocket = new ServerSocket(0);
      adminApiPort = adminApiSocket.getLocalPort();

      domainPublicSocket= new ServerSocket(0);
      domainPublicPort = domainPublicSocket.getLocalPort();

      domainAdminSocket = new ServerSocket(0);
      domainAdminPort = domainAdminSocket.getLocalPort();
    } finally {
      if (socket != null) {
        socket.close();
      }
      if (adminApiSocket != null) {
        adminApiSocket.close();
      }
      if (domainPublicSocket != null) {
        domainPublicSocket.close();
      }
      if (domainAdminSocket != null) {
        domainAdminSocket.close();
      }
    }

    // Start sandbox on the available ports
    final var sandboxDir = IntegrationTest.class.getResource("/sandbox").getPath();
    final var pb = new ProcessBuilder(
      "daml",
      "sandbox",
      "--static-time",
      "--port", sandboxPort.toString(),
      "--admin-api-port", adminApiPort.toString(),
      "--domain-public-port", domainPublicPort.toString(),
      "--domain-admin-port", domainAdminPort.toString(),
      "--config", "sandbox.conf",
      "--bootstrap", "sandbox.canton"
    ).directory(new File(sandboxDir))
     .redirectOutput(new File(sandboxDir + "/sandbox-output.log"))
     .redirectError(new File(sandboxDir + "/sandbox-error.log"));
    final var startTime = System.currentTimeMillis() / 1000L;
    sandboxProcess = pb.start();

    final var sandboxTimeoutSeconds = Long.valueOf(
      Optional.ofNullable(System.getProperty("walletviews.test.sandbox-start-timeout-seconds")).orElse("180")
    );
    logger.info("Waiting for sandbox to start with timeout set to " + sandboxTimeoutSeconds + " seconds");
    while (true) {
      if (!sandboxProcess.isAlive()) {
        throw new Exception("sandbox process has terminated. Please check logs under " + sandboxDir);
      }
      try {
        adminChannel = adminChannelBuilder().build();
        final var partyManagementService = PartyManagementServiceGrpc.newBlockingStub(adminChannel);
        partyManagementService.allocateParty(
          PartyManagementServiceOuterClass.AllocatePartyRequest.newBuilder().build()
        ); // attempt to allocate party to check ledger is ready
        for (final var darFileName :
          List.of(
            "daml-finance-holding.dar",
            "daml-finance-account.dar",
            "daml-finance-settlement.dar",
            "daml-finance-instrument-token.dar",
            "synfini-account-onboarding-open-offer.dar",
            "synfini-issuer-onboarding-token.dar"
          )
        ) {
          uploadDarFile(darFileName, adminChannel);
        }
        logger.info("Sandbox setup complete");
        break;
      } catch (StatusRuntimeException statusRuntimeException) {
        final var isUnavailable = statusRuntimeException.getStatus().getCode().equals(Status.UNAVAILABLE.getCode()) ||
          statusRuntimeException.getMessage().contains("PARTY_ALLOCATION_WITHOUT_CONNECTED_DOMAIN");
        if (!isUnavailable || (System.currentTimeMillis() / 1000L) - startTime > sandboxTimeoutSeconds) {
          logger.error(
            "Failed to connect to sandbox. Please check logs under " + sandboxDir
          );
          throw statusRuntimeException;
        } else {
          logger.info("Waiting for sandbox to start...");
          Thread.sleep(2000);
        }
      } catch (Exception e) {
        throw new RuntimeException(e);
      } finally {
        if (adminChannel != null) {
          shutdownChannel(adminChannel);
        }
      }
    }

    adminChannel = adminChannelBuilder().build();
  }

  @AfterAll
  static void afterAll() throws InterruptedException {
    if (adminChannel != null) {
      shutdownChannel(adminChannel);
    }

    postgresContainer.stop();

    if (sandboxProcess != null) {
      logger.info("Shutting down sandbox...");
      sandboxProcess.destroy();
      sandboxProcess.waitFor(15, TimeUnit.SECONDS);
      if (sandboxProcess.isAlive()) {
        throw new IllegalStateException("Failed to shutdown sandbox");
      }
    }
  }

  @BeforeEach
  void beforeEach() throws Exception {
    // DB setup
    final var defaultJdbcUrl = postgresContainer.getJdbcUrl();
    final var managementJdbcUrl = defaultJdbcUrl.substring(0, defaultJdbcUrl.lastIndexOf("/")) + "/postgres";
    logger.info("Setting up database using jdbc url: " + managementJdbcUrl);
    final var managementDbConn = DriverManager.getConnection(
      managementJdbcUrl,
      postgresContainer.getUsername(),
      postgresContainer.getPassword()
    );
    try {
      final var statement = managementDbConn.createStatement();
      statement.executeUpdate("DROP DATABASE " + postgresContainer.getDatabaseName());
      statement.executeUpdate("CREATE DATABASE " + postgresContainer.getDatabaseName());  
    } finally {
      managementDbConn.close();
    }

    final var entropy = UUID.randomUUID().toString().substring(0, 6);
    // Allocate parties
    final var partyManagementService = PartyManagementServiceGrpc.newBlockingStub(adminChannel);
    custodian = allocateParty(partyManagementService, "Custodian", entropy);
    investor1 = allocateParty(partyManagementService, "Investor1", entropy);
    investor2 = allocateParty(partyManagementService, "Investor2", entropy);;
    depository = allocateParty(partyManagementService, "Depository", entropy);
    issuer = allocateParty(partyManagementService, "Issuer", entropy);

    // Create users
    custodianUser = "custodian-" + entropy;
    investor1User = "investor1-" + entropy;
    investor2User = "investor2-" + entropy;
    issuerUser = "issuer-" + entropy;
    allPartiesUser = "all-parties-user-" + entropy;
    final var adminLedgerClient = DamlLedgerClient.newBuilder(adminChannelBuilder()).build();
    adminLedgerClient.connect();
    final var userManagementClient = adminLedgerClient.getUserManagementClient();
    userManagementClient.createUser(new CreateUserRequest(custodianUser, custodian)).blockingGet();
    userManagementClient.createUser(new CreateUserRequest(investor1User, investor1)).blockingGet();
    userManagementClient.createUser(new CreateUserRequest(investor2User, investor2)).blockingGet();
    userManagementClient.createUser(new CreateUserRequest(issuerUser, issuer)).blockingGet();
    userManagementClient.createUser(
      new CreateUserRequest(
        new User(allPartiesUser, custodian),
        new User.Right.CanActAs(custodian),
        new User.Right.CanActAs(investor1),
        new User.Right.CanActAs(investor2),
        new User.Right.CanActAs(depository),
        new User.Right.CanActAs(issuer)
      )
    ).blockingGet();
    adminLedgerClient.close();

    final var allPartiesChannelBuilder = sandboxChannelBuilder()
      .intercept(new AuthClientInterceptor(generateToken(allPartiesUser)));
    allPartiesChannel = allPartiesChannelBuilder.build();
    allPartiesLedgerClient = DamlLedgerClient.newBuilder(allPartiesChannelBuilder).build();
    allPartiesLedgerClient.connect();

    final var obs = arrayToSet(investor1, investor2, depository, issuer);
    final var obsMap = Collections.singletonMap("everyone", obs);
    final var accountFactory = new daml.finance.account.account.Factory(custodian, obsMap);
    final var accountOpenOfferFactory = new synfini.onboarding.account.openoffer.Factory(custodian, obsMap);
    final var holdingFactory = new daml.finance.holding.fungible.Factory(custodian, obsMap);
    final var settlementFactory = new daml.finance.settlement.factory.Factory(custodian, obs);
    final var tokenInstrumentFactory = new daml.finance.instrument.token.factory.Factory(custodian, obsMap);
    final var tokenIssuerFactory = new synfini.onboarding.issuer.instrument.token.Factory(custodian, obsMap);
    accountFactoryCid = new daml.finance.interface$.account.factory.Factory.ContractId(
      allPartiesLedgerClient
        .getCommandClient()
        .submitAndWaitForResult(allPartiesUpdateSubmission(accountFactory.create()))
        .blockingGet()
        .contractId
        .contractId
    );
    accountOpenOfferFactoryCid = new synfini.interface$.onboarding.account.openoffer.factory.Factory.ContractId(
      allPartiesLedgerClient
        .getCommandClient()
        .submitAndWaitForResult(allPartiesUpdateSubmission(accountOpenOfferFactory.create()))
        .blockingGet()
        .contractId
        .contractId
    );
    holdingFactoryCid = new daml.finance.interface$.holding.factory.Factory.ContractId(
      allPartiesLedgerClient
        .getCommandClient()
        .submitAndWaitForResult(allPartiesUpdateSubmission(holdingFactory.create()))
        .blockingGet()
        .contractId
        .contractId
    );
    settlementFactoryCid = new daml.finance.interface$.settlement.factory.Factory.ContractId(
      allPartiesLedgerClient
        .getCommandClient()
        .submitAndWaitForResult(allPartiesUpdateSubmission(settlementFactory.create()))
        .blockingGet()
        .contractId
        .contractId
    );
    tokenInstrumentFactoryCid = new daml.finance.interface$.instrument.token.factory.Factory.ContractId(
      allPartiesLedgerClient
        .getCommandClient()
        .submitAndWaitForResult(allPartiesUpdateSubmission(tokenInstrumentFactory.create()))
        .blockingGet()
        .contractId
        .contractId
    );
    tokenInstrumentIssuerFactoryCid = new synfini.interface$.onboarding.issuer.instrument.token.factory.Factory.ContractId(
      allPartiesLedgerClient
        .getCommandClient()
        .submitAndWaitForResult(allPartiesUpdateSubmission(tokenIssuerFactory.create()))
        .blockingGet()
        .contractId
        .contractId
    );
  }

  @AfterEach
  void afterEach() throws Exception {
    if (scribeProcess != null) {
      logger.info("Shutting down scribe...");
      scribeProcess.destroy();
      scribeProcess.waitFor(15, TimeUnit.SECONDS);
      if (scribeProcess.isAlive()) {
        throw new IllegalStateException("Failed to shutdown scribe");
      }
      logger.info("Successfully shutdown scribe");
      scribeProcess = null;
    }

    if (allPartiesChannel != null) {
      shutdownChannel(allPartiesChannel);
    }
    if (allPartiesLedgerClient != null) {
      allPartiesLedgerClient.close();
    }
  }

  @Test
  void testHasNoBalancesInitially() throws Exception {
    startScribe(custodian, custodianUser);

    final var account = new AccountKey(custodian, investor1, new Id("1"));

    // Check balances if account does not exist
    userTokenHeader(investor1User);
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<List<BalanceTyped>>(Collections.emptyList()))));

    // Create new account and check balances
    createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    delayForProjectionIngestion();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<List<BalanceTyped>>(Collections.emptyList()))));
  }

  @Test
  void testUpdatesBalanceAfterCreditsAndDebits() throws Exception {
    startScribe(custodian, custodianUser);

    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var creditAmount = new BigDecimal("99.0");
    creditAccount(accountCid, instrument1(), creditAmount);
    delayForProjectionIngestion();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(new Balance(account, instrument1(), creditAmount, BigDecimal.ZERO))
                )
              )
            )
          )
      );

    final var holdingCid_1_01 = creditAccount(accountCid, instrument1(), new BigDecimal("1.01"));
    delayForProjectionIngestion();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(new Balance(account, instrument1(), new BigDecimal("100.01"), BigDecimal.ZERO))
                )
              )
            )
          )
      );

    final var splitResult = splitHolding(
      new Fungible.ContractId(holdingCid_1_01.contractId),
      List.of(new BigDecimal("0.01"))
    );
    debitAccount(accountCid, new Base.ContractId(splitResult.splitCids.get(0).contractId));

    // Credit + debit the account (causing no change to balance)
    final var holdingCid_5 = creditAccount(accountCid, instrument1(), new BigDecimal("5.0"));
    debitAccount(accountCid, holdingCid_5);

    // Credit account
    creditAccount(accountCid, instrument1(), new BigDecimal("5.0"));
    delayForProjectionIngestion();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(new Balance(account, instrument1(), new BigDecimal("105.0"), BigDecimal.ZERO))
                )
              )
            )
          )
      );
  }

  @Test
  void testHasSameBalanceAfterSplit() throws Exception {
    startScribe(custodian, custodianUser);

    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var creditAmount = new BigDecimal("99.0");
    final var holdingCid = creditAccount(accountCid, instrument1(), creditAmount);
    splitHolding(
      new daml.finance.interface$.holding.fungible.Fungible.ContractId(holdingCid.contractId),
      List.of(new BigDecimal("42.1"), new BigDecimal("0.01"))
    );
    delayForProjectionIngestion();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(new Balance(account, instrument1(), creditAmount, BigDecimal.ZERO))
                )
              )
            )
          )
      );
  }

  @Test
  void returnsLockedBalances() throws Exception {
    startScribe(custodian, custodianUser);

    final var account = new AccountKey(custodian, investor1, new Id("1"));
    final var creditAmount= new BigDecimal("99.0");
    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var holdingCid = creditAccount(accountCid, instrument1(), creditAmount);

    final var lockedHoldingCid1 = lockHolding(holdingCid, arrayToSet(custodian), "ctx", LockType.REENTRANT);
    delayForProjectionIngestion();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(new Balance(account, instrument1(), BigDecimal.ZERO, creditAmount))
                )
              )
            )
          )
      );

    // Lock again with different lock context
    final var lockedHoldingCid2 = lockHolding(lockedHoldingCid1, arrayToSet(custodian), "ctx2", LockType.REENTRANT);
    delayForProjectionIngestion();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(
                    new Balance(account, instrument1(), BigDecimal.ZERO, creditAmount)
                  )
                )
              )
            )
          )
      );

    // Remove both locks
    final var unlockedHoldingCid = unlockHolding(
      unlockHolding(lockedHoldingCid2, "ctx"),
      "ctx2"
    );
    // Lock parts of the balance
    final var lockAmounts = List.of(new BigDecimal("1.0"), new BigDecimal("2.0"));
    final var totalLocked = lockAmounts.get(0).add(lockAmounts.get(1));
    final var splitResult = splitHolding(new Fungible.ContractId(unlockedHoldingCid.contractId), lockAmounts);

    lockHolding(
      new Base.ContractId(splitResult.splitCids.get(0).contractId),
      arrayToSet(custodian),
      "ctx",
      LockType.SEMAPHORE
    );
    delayForProjectionIngestion();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(
                    new Balance(account, instrument1(), creditAmount.subtract(lockAmounts.get(0)), lockAmounts.get(0))
                  )
                )
              )
            )
          )
      );

    lockHolding(
      new Base.ContractId(splitResult.splitCids.get(1).contractId),
      arrayToSet(custodian),
      "ctx2",
      LockType.SEMAPHORE
    );
    delayForProjectionIngestion();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(
                    new Balance(account, instrument1(), creditAmount.subtract(totalLocked), totalLocked)
                  )
                )
              )
            )
          )
      );
  }

  @Test
  void canReturnBalancesOfMultipleAssets() throws Exception {
    startScribe(custodian, custodianUser);

    final var account = new AccountKey(custodian, investor1, new Id("1"));
    final var creditAmount1 = new BigDecimal("99.0");
    final var creditAmount2 = new BigDecimal("0.001");

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    creditAccount(accountCid, instrument1(), creditAmount1);
    creditAccount(accountCid, instrument2(), creditAmount2);
    delayForProjectionIngestion();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                List.of(
                  new BalanceTyped(new Balance(account, instrument1(), creditAmount1, BigDecimal.ZERO)),
                  new BalanceTyped(new Balance(account, instrument2(), creditAmount2, BigDecimal.ZERO))
                )
              )
            )
          )
      );
  }

  @Test
  void doesNotReturnBalancesOfOtherAccounts() throws Exception {
    startScribe(custodian, custodianUser);

    final var account1 = new AccountKey(custodian, investor1, new Id("1"));
    final var account2 = new AccountKey(custodian, investor1, new Id("2"));
    final var creditAmount = new BigDecimal("1.0");

    final var accountCid1 = createAccount(account1, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    creditAccount(accountCid1, instrument1(), creditAmount);

    final var accountCid2 = createAccount(account2, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    creditAccount(accountCid2, instrument1(), creditAmount);

    delayForProjectionIngestion();

    mvc
      .perform(getBalanceByAccountBuilder(account1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(new Balance(account1, instrument1(), creditAmount, BigDecimal.ZERO))
                )
              )
            )
          )
      );
  }

  @Test
  void canReturnBalancesIfInitialisedAfterLedgerBegin() throws Exception {
    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var creditAmount = new BigDecimal("99.0");
    creditAccount(accountCid, instrument1(), creditAmount);
    delayForProjectionIngestion();

    startScribe(custodian, custodianUser);

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new BalanceTyped(new Balance(account, instrument1(), creditAmount, BigDecimal.ZERO))
                )
              )
            )
          )
      );
  }

  @Test
  void returnsHoldings() throws Exception {
    startScribe(custodian, custodianUser);
    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var creditAmount = new BigDecimal("99.0000000001");
    final var holdingCid = creditAccount(accountCid, instrument1(), creditAmount);
    final var ledgerOffset = getLedgerEnd();
    delayForProjectionIngestion();

    mvc
      .perform(getHoldingsBuilder(account, instrument1()).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new HoldingSummaryTyped(
                    new HoldingSummary<>(
                      holdingCid,
                      new View(instrument1(), account, creditAmount, Optional.empty()),
                      new TransactionDetail(ledgerOffset, Instant.EPOCH)
                    )
                  )
                )
              )
            )
          )
      );

    final var lockContext = "My context";
    final var lockType = LockType.REENTRANT;
    final var lockedHoldingCid = acquireLock(holdingCid, lockContext, lockType, custodian, investor2);
    final var newLedgerOffset = getLedgerEnd();
    delayForProjectionIngestion();

    final var expectedLock = new Lock(arrayToSet(custodian, investor2), arrayToSet(lockContext), lockType);
    mvc
      .perform(getHoldingsBuilder(account, instrument1()).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Result<>(
                Collections.singletonList(
                  new HoldingSummaryTyped(
                    new HoldingSummary<>(
                      lockedHoldingCid, new View(instrument1(), account, creditAmount, Optional.of(expectedLock)),
                      new TransactionDetail(newLedgerOffset, Instant.EPOCH)
                    )
                  )
                )
              )
            )
          )
      );
  }

  @Test
  void returnsAccounts() throws Exception {
    startScribe(custodian, custodianUser);

    mvc
      .perform(getAccountsBuilder(Optional.empty(), investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(Collections.emptyList()))));

    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var investor1Accounts = new Result<>(
      Collections.singletonList(
        new AccountSummaryTyped(
          new AccountSummary<>(
            accountCid,
            new daml.finance.interface$.account.account.View(
              account.custodian,
              account.owner,
              account.id,
              "Testing account",
              holdingFactoryCid,
              new Controllers(arrayToSet(investor1), arrayToSet())
            )
          )
        )
      )
    );

    delayForProjectionIngestion();
    mvc
      .perform(getAccountsBuilder(Optional.empty(), investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(investor1Accounts)
      )
    );
    mvc
      .perform(getAccountsBuilder(Optional.of(custodian), investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(investor1Accounts))
      );
    mvc
      .perform(getAccountsBuilder(Optional.of(custodian), investor1).headers(userTokenHeader(custodianUser)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(investor1Accounts))
      );
    mvc
      .perform(getAccountsBuilder(Optional.of(investor1), investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(new Result<>(List.of())))
      );

    mvc
      .perform(getAccountsBuilder(Optional.empty(), investor2).headers(userTokenHeader(investor2User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(Collections.emptyList()))));

    final Map<String, Set<String>> obs = new HashMap<>();
    final var newControllers = new Controllers(arrayToSet("X"), arrayToSet("Y"));
    final var newDescription = "new desc";
    final var newAccountCid = updateAccount(account, newControllers, newDescription, obs);
    delayForProjectionIngestion();

    mvc
      .perform(getAccountsBuilder(Optional.empty(), investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(
            new Result<>(
              Collections.singletonList(
                new AccountSummaryTyped(
                  new AccountSummary<>(
                    newAccountCid,
                    new daml.finance.interface$.account.account.View(
                      account.custodian,
                      account.owner,
                      account.id,
                      newDescription,
                      holdingFactoryCid,
                      newControllers
                    )
                  )
                )
              )
            )
          )
        )
      );

    removeAccount(account);
    delayForProjectionIngestion();

    mvc
      .perform(getAccountsBuilder(Optional.empty(), investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(
            new Result<>(
              Collections.emptyList()
            )
          )
        )
      );
  }

  @Test
  void returnsAccountOpenOffers() throws Exception {
    startScribe(custodian, custodianUser);

    final var ownerIncomingControlled = false;
    final var ownerOutgoingControlled = true;
    final var additionalControllers = new Controllers(
      listToSet(List.of(custodian)),
      listToSet(List.of(custodian, investor2))
    );
    final var description = "description";
    final var cid1 = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(
          accountOpenOfferFactoryCid.exerciseCreate(
            custodian,
            ownerIncomingControlled,
            ownerOutgoingControlled,
            additionalControllers,
            Optional.empty(),
            accountFactoryCid,
            holdingFactoryCid,
            description,
            Map.of("obs", listToSet(List.of(investor1, investor2)))
          )
        )
      )
      .blockingGet().exerciseResult;
    final var offset1 = getLedgerEnd();
    final Optional<da.set.types.Set<String>> permittedOwnersInvestor2 = Optional.of(arrayToSet(investor2));
    final var cid2 = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(
          accountOpenOfferFactoryCid.exerciseCreate(
            custodian,
            ownerIncomingControlled,
            ownerOutgoingControlled,
            additionalControllers,
            permittedOwnersInvestor2,
            accountFactoryCid,
            holdingFactoryCid,
            description,
            Map.of()
          )
        )
      )
      .blockingGet().exerciseResult;
    final var offset2 = getLedgerEnd();
    delayForProjectionIngestion();

    mvc
      .perform(getAccountOpenOffersBuilder().headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(
            new Result<>(
              List.of(
                new AccountOpenOfferSummaryTyped(
                  new AccountOpenOfferSummary<>(
                    cid1,
                    new synfini.interface$.onboarding.account.openoffer.openoffer.View(
                      custodian,
                      ownerIncomingControlled,
                      ownerOutgoingControlled,
                      additionalControllers,
                      Optional.empty(),
                      accountFactoryCid,
                      holdingFactoryCid,
                      description
                    ),
                    new TransactionDetail(offset1, Instant.EPOCH)
                  )
                )
              )
            )
          )
        )
      );

    mvc
      .perform(getAccountOpenOffersBuilder().headers(userTokenHeader(investor2User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(
            new Result<>(
              List.of(
                new AccountOpenOfferSummaryTyped(
                  new AccountOpenOfferSummary<>(
                    cid1,
                    new synfini.interface$.onboarding.account.openoffer.openoffer.View(
                      custodian,
                      ownerIncomingControlled,
                      ownerOutgoingControlled,
                      additionalControllers,
                      Optional.empty(),
                      accountFactoryCid,
                      holdingFactoryCid,
                      description
                    ),
                    new TransactionDetail(offset1, Instant.EPOCH)
                  )
                ),
                new AccountOpenOfferSummaryTyped(
                  new AccountOpenOfferSummary<>(
                    cid2,
                    new synfini.interface$.onboarding.account.openoffer.openoffer.View(
                      custodian,
                      ownerIncomingControlled,
                      ownerOutgoingControlled,
                      additionalControllers,
                      permittedOwnersInvestor2,
                      accountFactoryCid,
                      holdingFactoryCid,
                      description
                    ),
                    new TransactionDetail(offset2, Instant.EPOCH)
                  )
                )
              )
            )
          )
        )
      );

    allPartiesLedgerClient
      .getCommandClient()
      .submitAndWait(allPartiesCommandSubmission(List.of(cid1.exerciseArchive(new Archive()))))
      .blockingGet();
    delayForProjectionIngestion();

    mvc
      .perform(getAccountOpenOffersBuilder().headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(List.of()))));
  }

  @Test
  void returnsIssuers() throws Exception {
    startScribe(issuer, issuerUser);

    final var tokenIssuerCid = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(
          tokenInstrumentIssuerFactoryCid.exerciseCreate(
            depository,
            issuer,
            tokenInstrumentFactoryCid,
            Map.of("obs", arrayToSet(investor1))
          )
        )
      ).blockingGet().exerciseResult;
    delayForProjectionIngestion();

    final var tokenIssuerSummary = new IssuerSummaryTyped(
      new IssuerSummary<>(
        Optional.of(
          new TokenIssuerSummary<>(
            tokenIssuerCid,
            new synfini.interface$.onboarding.issuer.instrument.token.issuer.View(
              depository,
              issuer,
              tokenInstrumentFactoryCid
            )
          )
        )
      )
    );

    mvc
      .perform(
        getIssuersBuilder(Optional.empty(), Optional.empty()).headers(userTokenHeader(issuerUser))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(List.of(tokenIssuerSummary)))));

    mvc
      .perform(
        getIssuersBuilder(Optional.of(depository), Optional.empty()).headers(userTokenHeader(issuerUser))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(List.of(tokenIssuerSummary)))));

    mvc
      .perform(
        getIssuersBuilder(Optional.empty(), Optional.of(issuer)).headers(userTokenHeader(issuerUser))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(List.of(tokenIssuerSummary)))));

    mvc
      .perform(
        getIssuersBuilder(
          Optional.of("other depository"),
          Optional.empty()
        ).headers(userTokenHeader(issuerUser))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(List.of()))));

    mvc
      .perform(
        getIssuersBuilder(
          Optional.empty(),
          Optional.of("other issuer")
        ).headers(userTokenHeader(issuerUser))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(List.of()))));

    mvc
      .perform(
        getIssuersBuilder(Optional.empty(), Optional.empty()).headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(List.of(tokenIssuerSummary)))));

    mvc
      .perform(
        getIssuersBuilder(Optional.empty(), Optional.empty()).headers(userTokenHeader(investor2User))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Result<>(List.of()))));
  }

  @Test
  void returnsSingleSettlement() throws Exception {
    startScribe(investor2, investor2User);

    final var investor1Account = new AccountKey(custodian, investor1, new Id("1"));
    final var investor1AccountCid = createAccount(investor1Account, List.of(investor1), List.of(), List.of());
    final var investor2Account = new AccountKey(custodian, investor2, new Id("2"));
    final var investor2AccountCid = createAccount(investor2Account, List.of(investor2), List.of(), List.of());
    final var amount = new BigDecimal("100.0000000001");
    final var investor1HoldingCid = creditAccount(investor1AccountCid, instrument1(), amount);
    final var investor2HoldingCid = creditAccount(investor2AccountCid, instrument1(), amount);

    final var batchId = new Id("batch1");
    final var description = "tx description";
    final Optional<Id> contextId = Optional.empty();
    final Quantity<InstrumentKey, BigDecimal> q = new Quantity<>(instrument1(), amount);
    // To test all possible allocation/approval types we create settlement with the below instructions, and allocation/approvals
    // I0: Custodian -> Inv2: CreditReceiver, TakeDelivery
    // I1: Inv2 -> Custodian: Pledge, DebitSender
    // I2: Inv1 -> Inv2: Pledge, PassThroughTo(I3)
    // I3: Inv2 -> Inv2: PassThroughFrom(I2), TakeDelivery
    // I4: Inv1 -> Inv2: SettleOffledger, SettleOffledgerAcknowledge
    final var s0 = new RoutedStep(custodian, investor2, custodian, q);
    final var s1 = new RoutedStep(investor2, custodian, custodian, q);
    final var s2 = new RoutedStep(investor1, investor2, custodian, q);
    final var s3 = new RoutedStep(investor2, investor2, custodian, q);
    final var s4 = new RoutedStep(investor1, investor2, custodian, q);
    final var requestors = arrayToSet(investor1);
    final var settlers = arrayToSet(custodian);

    final var createBatchResult = createBatch(
      new Instruct(
        requestors,
        settlers,
        batchId,
        description,
        contextId,
        List.of(s0, s1, s2, s3, s4),
        Optional.empty()
      )
    );

    final List<
      SettlementStep<
        RoutedStep,
        Id,
        daml.finance.interface$.settlement.instruction.Instruction.ContractId,
        Allocation,
        Approval
      >
    > expectedSteps = new ArrayList<>();
    expectedSteps.addAll(
      List.of(
        new SettlementStep<>(
          s0,
          createBatchResult.instructionIds.get(0),
          createBatchResult.instructionCids.get(0),
          new Unallocated(Unit.getInstance()),
          new Unapproved(Unit.getInstance())
        ),
        new SettlementStep<>(
          s1,
          createBatchResult.instructionIds.get(1),
          createBatchResult.instructionCids.get(1),
          new Unallocated(Unit.getInstance()),
          new Unapproved(Unit.getInstance())
        ),
        new SettlementStep<>(
          s2,
          createBatchResult.instructionIds.get(2),
          createBatchResult.instructionCids.get(2),
          new Unallocated(Unit.getInstance()),
          new Unapproved(Unit.getInstance())
        ),
        new SettlementStep<>(
          s3,
          createBatchResult.instructionIds.get(3),
          createBatchResult.instructionCids.get(3),
          new Unallocated(Unit.getInstance()),
          new Unapproved(Unit.getInstance())
        ),
        new SettlementStep<>(
          s4,
          createBatchResult.instructionIds.get(4),
          createBatchResult.instructionCids.get(4),
          new Unallocated(Unit.getInstance()),
          new Unapproved(Unit.getInstance())
        )
      )
    );

    // Return expected settlements given the optional settlement transaction detail
    final Function<Optional<TransactionDetail>, Result<List<SettlementSummaryTyped>>> expectedSettlements = (settle) ->
      new Result<>(
        List.of(
          new SettlementSummaryTyped(
            new SettlementSummary<>(
              batchId,
              requestors,
              settlers,
              Optional.<daml.finance.interface$.settlement.batch.Batch.ContractId>empty(),
              Optional.<Id>empty(),
              Optional.<String>empty(),
              expectedSteps,
              new TransactionDetail(createBatchResult.offset, Instant.EPOCH),
              settle
            )
          )
        )
      );

    delayForProjectionIngestion();
    // Check unallocated/unapproved settlement
    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.empty())
          .headers(userTokenHeader(investor2User))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(expectedSettlements.apply(Optional.empty()))));

    // Instruction 0
    final var instruction0Allocation = new CreditReceiver(Unit.getInstance());
    final var instruction0AllocationResult = allocate(
      createBatchResult.instructionCids.get(0),
      instruction0Allocation,
      List.of(custodian)
    );
    final var instruction0Approval = new TakeDelivery(investor2Account);
    final var instructionCid0 = approve(
      instruction0AllocationResult.instructionCid,
      instruction0Approval,
      List.of(investor2)
    );
    expectedSteps.set(
      0,
      new SettlementStep<>(
        expectedSteps.get(0).routedStep,
        expectedSteps.get(0).instructionId,
        instructionCid0,
        instruction0Allocation,
        instruction0Approval
      )
    );

    // Instruction 1
    final var instruction1AllocationResult = allocate(
      createBatchResult.instructionCids.get(1),
      new Pledge(investor2HoldingCid),
      List.of(investor2)
    );
    final var instruction1Approval = new DebitSender(Unit.getInstance());
    final var instructionCid1 = approve(
      instruction1AllocationResult.instructionCid,
      instruction1Approval,
      List.of(custodian)
    );
    expectedSteps.set(
      1,
      new SettlementStep<>(
        expectedSteps.get(1).routedStep,
        expectedSteps.get(1).instructionId,
        instructionCid1,
        new Pledge(instruction1AllocationResult.allocatedHoldingCid.get()),
        instruction1Approval
      )
    );

    // Instruction 2
    final var instruction2AllocationResult = allocate(
      createBatchResult.instructionCids.get(2),
      new Pledge(investor1HoldingCid),
      List.of(investor1)
    );
    final var instruction2Approval = new PassThroughTo(
      new Tuple2<>(investor2Account, new InstructionKey(requestors, batchId, createBatchResult.instructionIds.get(3)))
    );
    final var instructionCid2 = approve(
      instruction2AllocationResult.instructionCid,
      instruction2Approval,
      List.of(investor2)
    );
    expectedSteps.set(
      2,
      new SettlementStep<>(
        expectedSteps.get(2).routedStep,
        expectedSteps.get(2).instructionId,
        instructionCid2,
        new Pledge(instruction2AllocationResult.allocatedHoldingCid.get()),
        instruction2Approval
      )
    );

    // Instruction 3
    final var instruction3Allocation = new PassThroughFrom(
      new Tuple2<>(investor2Account, new InstructionKey(requestors, batchId, createBatchResult.instructionIds.get(2)))
    );
    final var instruction3AllocationResult = allocate(
      createBatchResult.instructionCids.get(3),
      instruction3Allocation,
      List.of(investor2)
    );
    final var instruction3Approval = new TakeDelivery(investor2Account);
    final var instructionCid3 = approve(
      instruction3AllocationResult.instructionCid,
      instruction3Approval,
      List.of(investor2)
    );
    expectedSteps.set(
      3,
      new SettlementStep<>(
        expectedSteps.get(3).routedStep,
        expectedSteps.get(3).instructionId,
        instructionCid3,
        instruction3Allocation,
        instruction3Approval
      )
    );

    // Instruction 4
    final var instruction4Allocation = new SettleOffledger(Unit.getInstance());
    final var instruction4AllocationResult = allocate(
      createBatchResult.instructionCids.get(4),
      instruction4Allocation,
      List.of(investor1, custodian)
    );
    final var instruction4Approval = new SettleOffledgerAcknowledge(Unit.getInstance());
    final var instructionCid4 = approve(
      instruction4AllocationResult.instructionCid,
      instruction4Approval,
      List.of(investor2, custodian)
    );
    expectedSteps.set(
      4,
      new SettlementStep<>(
        expectedSteps.get(4).routedStep,
        expectedSteps.get(4).instructionId,
        instructionCid4,
        instruction4Allocation,
        instruction4Approval
      )
    );

    // Check allocated/approved instructions
    delayForProjectionIngestion();
    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.empty())
          .headers(userTokenHeader(investor2User))
      )
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(expectedSettlements.apply(Optional.empty()))));

    // Check that other party cannot see the batch/instructions
    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.empty())
          .headers(userTokenHeader(issuerUser))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(new Result<>(List.of())))
      );
  }

  @Test
  void returnsMultipleSettlements() throws Exception {
    startScribe(investor1, investor1User);

    final var investor1Account = new AccountKey(custodian, investor1, new Id("1"));
    final var investor1AccountCid = createAccount(investor1Account, List.of(investor1), List.of(), List.of());
    final var investor2Account = new AccountKey(custodian, investor2, new Id("2"));
    createAccount(investor2Account, List.of(investor2), List.of(), List.of(investor1));
    final var amount = new BigDecimal("99.0000000001");
    final var investor1HoldingCid = creditAccount(investor1AccountCid, instrument1(), amount);

    // BEGIN batch 1
    final var batch1Id = new Id("batch1");
    final var description1 = "tx description";
    final Optional<Id> contextId1 = Optional.empty();
    final var routedStep1 = new RoutedStep(investor1, investor2, custodian, new Quantity<>(instrument1(), amount));
    final var requestors1 = arrayToSet(investor1);
    final var settlers1 = requestors1;
    final var createBatchResult1 = createBatch(
      new Instruct(
        requestors1,
        settlers1,
        batch1Id,
        description1,
        contextId1,
        List.of(routedStep1),
        Optional.empty()
      )
    );
    final var allocation1 = new Pledge(investor1HoldingCid);
    final var allocationResult1 = allocate(createBatchResult1.instructionCids.get(0), allocation1, List.of(investor1));
    final var approval1 = new TakeDelivery(investor2Account);
    final var approvedInstructionCid1 = approve(allocationResult1.instructionCid, approval1, List.of(investor2));
    settleBatch(createBatchResult1.batchCid, List.of(investor1));
    final var settleOffset1 = getLedgerEnd();
    // END batch1

    // BEGIN batch 2
    final var batch2Id = batch1Id; // use the same batch ID, but different requestors (making the key different)
    final var description2 = "tx description 2";
    final Optional<Id> contextId2 = Optional.of(new Id("Context ID"));
    final var routedStep2 = new RoutedStep(investor2, investor1, custodian, new Quantity<>(instrument1(), amount));
    final var requestors2 = arrayToSet(investor1, investor2);
    final var settlers2 = arrayToSet(investor2);
    final var createBatchResult2 = createBatch(
      new Instruct(
        requestors2,
        settlers2,
        batch2Id,
        description2,
        contextId2,
        List.of(routedStep2),
        Optional.empty()
      )
    );
    final var approval2 = new TakeDelivery(investor1Account);
    // Custodian will witness the Instruction creation as they act as controller
    final var approvedInstruction2Cid = approve(
      createBatchResult2.instructionCids.get(0), approval2, List.of(investor1, custodian)
    );
    final var approval2LedgerOffset = getLedgerEnd();
    // END batch2

    delayForProjectionIngestion();

    final var settlement1 = new SettlementSummaryTyped(
      new SettlementSummary<>(
        batch1Id,
        requestors1,
        settlers1,
        Optional.of(createBatchResult1.batchCid),
        contextId1,
        Optional.of(description1),
        List.of(
          new SettlementStep<>(
            routedStep1,
            createBatchResult1.instructionIds.get(0),
            approvedInstructionCid1,
            new Pledge(allocationResult1.allocatedHoldingCid.get()),
            approval1
          )
        ),
        new TransactionDetail(createBatchResult1.offset, Instant.EPOCH),
        Optional.of(new TransactionDetail(settleOffset1, Instant.EPOCH))
      )
    );

    final var settlement2 = new SettlementSummaryTyped(
      new SettlementSummary<>(
        batch2Id,
        requestors2,
        settlers2,
        Optional.of(createBatchResult2.batchCid),
        contextId2,
        Optional.of(description2),
        List.of(
          new SettlementStep<>(
            routedStep2,
            createBatchResult2.instructionIds.get(0),
            approvedInstruction2Cid,
            new Unallocated(Unit.getInstance()),
            approval2
          )
        ),
        new TransactionDetail(createBatchResult2.offset, Instant.EPOCH),
        Optional.empty()
      )
    );
    final var settlement2VisibleToCustodian = new SettlementSummaryTyped(
      new SettlementSummary<>(
        settlement2.unpack.batchId,
        settlement2.unpack.requestors,
        settlement2.unpack.settlers,
        Optional.empty(),
        Optional.empty(),
        Optional.empty(),
        settlement2.unpack.steps,
        new TransactionDetail(approval2LedgerOffset, Instant.EPOCH),
        Optional.empty()
      )
    );

    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.empty())
          .headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(new Result<>(List.of(settlement1, settlement2)))
        )
      );

    mvc
      .perform(
        getSettlementsBuilder(Optional.of(createBatchResult2.offset), Optional.empty())
          .headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(new Result<>(List.of(settlement1)))
        )
      );

    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.of(1L))
          .headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(new Result<>(List.of(settlement2)))
        )
      );

    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.empty())
          .headers(userTokenHeader(custodianUser))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(new Result<>(List.of(settlement2VisibleToCustodian)))
        )
      );
  }

  @Test
  void returnsTokenInstruments() throws Exception {
    startScribe(investor1, investor1User);

    final var token1 = new Token(instrument1(), "my desc", Instant.EPOCH);
    final var token2 = new Token(instrument2(), "my desc 2", Instant.EPOCH);
    final var obs = Collections.singletonMap("o", arrayToSet(investor1));
    final var token1Cid = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(tokenInstrumentFactoryCid.exerciseCreate(token1, obs))
      ).blockingGet().exerciseResult;
    final var token2Cid = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(tokenInstrumentFactoryCid.exerciseCreate(token2, obs))
      ).blockingGet().exerciseResult;
    delayForProjectionIngestion();

    final var instrument1Summary = new InstrumentSummaryTyped(
      new InstrumentSummary<>(
        new daml.finance.interface$.instrument.base.instrument.Instrument.ContractId(token1Cid.contractId),
        Optional.of(new daml.finance.interface$.instrument.token.instrument.View(token1))
      )
    );
    final var instrument2Summary = new InstrumentSummaryTyped(
      new InstrumentSummary<>(
        new daml.finance.interface$.instrument.base.instrument.Instrument.ContractId(token2Cid.contractId),
        Optional.of(new daml.finance.interface$.instrument.token.instrument.View(token2))
      )
    );
    mvc
      .perform(
        getInstrumentsBuilder(
          Optional.of(token1.instrument.depository),
          token1.instrument.issuer,
          Optional.of(token1.instrument.id),
          Optional.of(token1.instrument.version)
        ).headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(new Result<>(List.of(instrument1Summary))))
      );
    mvc
      .perform(
        getInstrumentsBuilder(
          Optional.of(token1.instrument.depository),
          token1.instrument.issuer,
          Optional.of(token1.instrument.id),
          Optional.empty()
        ).headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(new Result<>(List.of(instrument1Summary, instrument2Summary))))
      );
    mvc
      .perform(
        getInstrumentsBuilder(
          Optional.of(token1.instrument.depository),
          token1.instrument.issuer,
          Optional.empty(),
          Optional.empty()
        ).headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(new Result<>(List.of(instrument1Summary, instrument2Summary))))
      );
    mvc
      .perform(
        getInstrumentsBuilder(
          Optional.empty(),
          token1.instrument.issuer,
          Optional.empty(),
          Optional.empty()
        ).headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(new Result<>(List.of(instrument1Summary, instrument2Summary))))
      );
  }

  @Test
  void deniesAccessWithoutToken() throws Exception {
    mvc
      .perform(getAccountsBuilder(Optional.empty(), investor1))
      .andExpect(status().isUnauthorized());

    mvc
      .perform(
        getBalanceByAccountBuilder(new AccountKey(custodian, investor1, new Id("1")))
      )
      .andExpect(status().isUnauthorized());

    mvc
      .perform(
        getHoldingsBuilder(
          new AccountKey(custodian, investor1, new Id("1")), instrument1()
        )
      )
      .andExpect(status().isUnauthorized());
  }

  @Test
  void deniesAccessToOtherParties() throws Exception {
    mvc
      .perform(getAccountsBuilder(Optional.empty(), investor1).headers(userTokenHeader(investor2User)))
      .andExpect(status().isForbidden());

    mvc
      .perform(
        getBalanceByAccountBuilder(
          new AccountKey(custodian, investor1, new Id("1"))
        ).headers(userTokenHeader(investor2User))
      )
      .andExpect(status().isForbidden());
  }

  private static daml.finance.interface$.holding.base.Base.ContractId acquireLock(
    daml.finance.interface$.holding.base.Base.ContractId holdingCid,
    String context,
    LockType lockType,
    String... newLockers
  ) {
    final var exerciseCommand = holdingCid.exerciseAcquire(
      arrayToSet(newLockers),
      context,
      lockType
    );
    return allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(allPartiesUpdateSubmission(exerciseCommand))
      .blockingGet()
      .exerciseResult;
  }

  private static NettyChannelBuilder adminChannelBuilder() {
    return sandboxChannelBuilder().intercept(new AuthClientInterceptor(generateToken("participant_admin")));
  }

  private static AllocationResult allocate(
    Instruction.ContractId instructionCid,
    Allocation allocation,
    List<String> allocators
  ) {
    final var r = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(instructionCid.exerciseAllocate(listToSet(allocators), allocation))
      ).blockingGet().exerciseResult;
    final var instructionView = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(r._1.exerciseGetView(allocators.get(0)))
      ).blockingGet().exerciseResult;
    final Optional<Base.ContractId> cid = instructionView.allocation instanceof Pledge ?
      Optional.of(((Pledge) instructionView.allocation).contractIdValue) :
      Optional.empty();
    return new AllocationResult(r._1, cid);
  }

  private static String allocateParty(
    PartyManagementServiceGrpc.PartyManagementServiceBlockingStub partyManagementService,
    String name,
    String entropy
  ) {
    return partyManagementService.allocateParty(
      PartyManagementServiceOuterClass.AllocatePartyRequest
        .newBuilder()
        .setPartyIdHint(name + "-" + entropy)
        .setDisplayName(name)
        .build()
    ).getPartyDetails().getParty();
  }

  private static CommandsSubmission allPartiesCommandSubmission(List<? extends HasCommands> commands) {
    return CommandsSubmission
      .create(allPartiesUser, UUID.randomUUID().toString(), commands)
      .withActAs(List.of(custodian, investor1, investor2));
  }

  private static <U> UpdateSubmission<U> allPartiesUpdateSubmission(Update<U> update) {
    return UpdateSubmission
      .create(allPartiesUser, UUID.randomUUID().toString(), update)
      .withActAs(List.of(custodian, investor1, investor2, depository, issuer));
  }

  private static Instruction.ContractId approve(
    Instruction.ContractId instructionCid,
    Approval approval,
    List<String> approvers
  ) {
    return allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(instructionCid.exerciseApprove(listToSet(approvers), approval))
      ).blockingGet().exerciseResult;
  }

  private static da.set.types.Set<String> arrayToSet(String... collection) {
    Map<String, Unit> map = new HashMap<>();
    for (String elem : collection) {
      map.put(elem, Unit.getInstance());
    }
    return new da.set.types.Set<>(map);
  }

  private static String base64(JsonObject json) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(new Gson().toJson(json).getBytes());
  }

  private static String base64(byte[] bytes) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private static daml.finance.interface$.account.account.Account.ContractId createAccount(
    AccountKey account,
    List<String> outgoingControllers,
    List<String> incomingControllers,
    List<String> observers
  ) {
    final var exerciseCommand = accountFactoryCid.exerciseCreate(
      account,
      holdingFactoryCid,
      new daml.finance.interface$.account.account.Controllers(
        listToSet(outgoingControllers),
        listToSet(incomingControllers)
      ),
      "Testing account",
      Collections.singletonMap("observers", listToSet(observers))
    );
    return allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(allPartiesUpdateSubmission(exerciseCommand))
      .blockingGet()
      .exerciseResult;
  }

  private static CreateBatchResult createBatch(Instruct instruct) {
    final var actAs = instruct.instructors.map.keySet().stream().collect(Collectors.toList());
    final var r = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        UpdateSubmission.create(
          allPartiesUser,
          UUID.randomUUID().toString(),
          settlementFactoryCid.exerciseInstruct(instruct)
        ).withActAs(actAs)
      ).blockingGet();
    final var offset = getLedgerEnd();
    final var batchIds = r
      .exerciseResult
      ._2
      .stream()
      .map(cid ->
        allPartiesLedgerClient
          .getCommandClient()
          .submitAndWaitForResult(
            UpdateSubmission.create(
              allPartiesUser,
              UUID.randomUUID().toString(),
              cid.exerciseGetView(actAs.get(0))
            ).withActAs(actAs)
          ).blockingGet().exerciseResult.id
      )
      .collect(Collectors.toList());
    return new CreateBatchResult(r.exerciseResult._1, r.exerciseResult._2, batchIds, offset);
  }

  private static ByteString createBufferInputStream(InputStream inputStream) throws IOException {
    ByteString buffer = ByteString.EMPTY;
    try {
      buffer = ByteString.readFrom(inputStream);
    } finally {
      if (inputStream != null) inputStream.close();
    }
    return buffer;
  }

  private static daml.finance.interface$.holding.base.Base.ContractId creditAccount(
    daml.finance.interface$.account.account.Account.ContractId accountCid,
    InstrumentKey instrument,
    BigDecimal amount
  ) {
    var exerciseCommand = accountCid.exerciseCredit(new Credit(new Quantity<>(instrument, amount)));
    return allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(allPartiesUpdateSubmission(exerciseCommand))
      .blockingGet()
      .exerciseResult;
  }

  private static void debitAccount(
    daml.finance.interface$.account.account.Account.ContractId accountCid,
    daml.finance.interface$.holding.base.Base.ContractId holdingCid
  ) {
    var exerciseCommand = accountCid.exerciseDebit(holdingCid);
    allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(allPartiesUpdateSubmission(exerciseCommand))
      .blockingGet();
  }

  // Delay used to account for possible lag between when an event is added to ledger, and writing the event
  // to the DB. In future, rather than hard coding the delay, we could poll the check point offset in the database and
  // wait until it reaches the desired value.
  private static void delayForProjectionIngestion() throws InterruptedException {
    Thread.sleep(5_000);
  }

  private static String generateToken(
    String userId
  ) {
    JsonObject header = new JsonObject();
    header.addProperty("alg", "HS256");
    header.addProperty("typ", "JWT");

    JsonObject payload = new JsonObject();
    payload.addProperty("sub", userId);
    payload.addProperty("aud", tokenAudience);

    String headerAndPayload = base64(header) + "." + base64(payload);

    byte[] hash = "secret".getBytes(StandardCharsets.UTF_8);
    Mac sha256Hmac = null;
    try {
      sha256Hmac = Mac.getInstance("HmacSHA256");
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }
    SecretKeySpec secretKey = new SecretKeySpec(hash, "HmacSHA256");
    try {
      sha256Hmac.init(secretKey);
    } catch (InvalidKeyException e) {
      throw new RuntimeException(e);
    }

    byte[] signature = sha256Hmac.doFinal(headerAndPayload.getBytes(StandardCharsets.UTF_8));

    return headerAndPayload + "." + base64(signature);
  }

  private static MockHttpServletRequestBuilder getAccountsBuilder(Optional<String> custodian, String owner) {
    return MockMvcRequestBuilders
      .post(walletViewsBasePath + "accounts")
      .content(toJson(new AccountFilter(custodian, owner)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getAccountOpenOffersBuilder() {
    return MockMvcRequestBuilders
      .post(walletViewsBasePath + "account-open-offers")
      .content(toJson(new AccountOpenOffersFilter()))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getBalanceByAccountBuilder(AccountKey account) {
    return MockMvcRequestBuilders
      .post(walletViewsBasePath + "balance")
      .content(toJson(new BalanceFilter(account)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getHoldingsBuilder(AccountKey account, InstrumentKey instrument) {
    return MockMvcRequestBuilders
      .post(walletViewsBasePath + "holdings")
      .content(toJson(new HoldingFilter(account, instrument)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getInstrumentsBuilder(
    Optional<String> dep,
    String iss,
    Optional<Id> id,
    Optional<String> version
  ) {
    return MockMvcRequestBuilders
      .post(walletViewsBasePath + "instruments")
      .content(toJson(new InstrumentsFilter(dep, iss, id, version)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getIssuersBuilder(Optional<String> depository, Optional<String> issuer) {
    return MockMvcRequestBuilders
      .post(walletViewsBasePath + "issuers")
      .content(toJson(new IssuersFilter(depository, issuer)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getSettlementsBuilder(
    Optional<String> before,
    Optional<Long> limit
  ) {
    return MockMvcRequestBuilders
      .post(walletViewsBasePath + "settlements")
      .content(toJson(new SettlementsFilter(before, limit)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static String getLedgerEnd() {
    return (
      (LedgerOffset.Absolute) allPartiesLedgerClient.getTransactionsClient().getLedgerEnd().blockingGet()
    ).getOffset();
  }

  private static InstrumentKey instrument1() {
    return new InstrumentKey(
      depository,
      issuer,
      new Id("someId"),
      "someVersion"
    );
  }

  private static InstrumentKey instrument2() {
    return new InstrumentKey(
      depository,
      issuer,
      new Id("someId"),
      "someVersion2"
    );
  }

  private static InputStream readResource(String fileName) throws FileNotFoundException {
    // The class loader that loaded the class
    ClassLoader classLoader = IntegrationTest.class.getClassLoader();
    InputStream inputStream = classLoader.getResourceAsStream(fileName);

    // the stream holding the file content
    if (inputStream == null) {
      throw new FileNotFoundException("Resource not found: " + fileName);
    } else {
      return inputStream;
    }
  }

  private static Set<String> listToSet(List<String> l) {
    return arrayToSet(l.toArray(new String[]{}));
  }

  private static Base.ContractId lockHolding(
    Base.ContractId holdingCid,
    Set<String> lockers,
    String context,
    LockType lockType
  ) {
    return allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(holdingCid.exerciseAcquire(lockers, context, lockType))
      )
      .blockingGet()
      .exerciseResult;
  }

  private static void removeAccount(AccountKey account) {
    allPartiesLedgerClient
      .getCommandClient()
      .submitAndWait(allPartiesCommandSubmission(List.of(accountFactoryCid.exerciseRemove(account))))
      .blockingGet();
  }

  private static NettyChannelBuilder sandboxChannelBuilder() {
    String sandboxHost = "127.0.0.1";
    return NettyChannelBuilder
      .forAddress(sandboxHost, sandboxPort)
      .maxInboundMessageSize(200 * 1024 * 1024) // 200 MiB
      .usePlaintext();
  }

  private static void settleBatch(Batch.ContractId batchCid, List<String> settlers) {
    allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        allPartiesUpdateSubmission(batchCid.exerciseSettle(listToSet(settlers)))
      ).blockingGet();
  }

  private static void shutdownChannel(ManagedChannel channel) {
    try {
      if (!channel.shutdownNow().awaitTermination(5, TimeUnit.SECONDS)) {
        logger.warn("Channel not shutdown");
      }
    } catch (Throwable t) {
      logger.warn("Error shutting down channel", t);
    }
  }

  private static SplitResult splitHolding(
    daml.finance.interface$.holding.fungible.Fungible.ContractId holdingCid,
    List<BigDecimal> amounts
  ) {
    final var exerciseCommand = holdingCid.exerciseSplit(amounts);
    return allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(allPartiesUpdateSubmission(exerciseCommand))
      .blockingGet()
      .exerciseResult;
  }

  private void startScribe(String readAs, String userId) throws Exception {
    if (scribeProcess != null) {
      throw new Exception("Scribe process should be null (cannot start multiple scribe instances concurrently)");
    }
    final Integer healthPort;
    ServerSocket healthSocket = null;

    try {
      healthSocket = new ServerSocket(0);
      healthPort = healthSocket.getLocalPort();
    } finally {
      if (healthSocket != null) {
        healthSocket.close();
      }
    }

    final var scribeLocation = System.getenv("SCRIBE_LOCATION");
    if (scribeLocation == null) {
      throw new IllegalArgumentException("Please set required environment variable: SCRIBE_LOCATION");
    }

    final var pb = new ProcessBuilder(
      scribeLocation,
      "pipeline",
      "ledger",
      "postgres-document",
      "--source-ledger-port", sandboxPort.toString(),
      "--pipeline-datasource", "TransactionStream",
      "--pipeline-filter-parties", readAs,
      "--target-postgres-username", postgresContainer.getUsername(),
      "--target-postgres-password", postgresContainer.getPassword(),
      "--target-postgres-database", postgresContainer.getDatabaseName(),
      "--target-postgres-host", postgresContainer.getHost(),
      "--target-postgres-port", postgresContainer.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT).toString(),
      "--health-port", healthPort.toString(),
      "--source-ledger-auth", "OAuth",
      "--pipeline-oauth-accesstoken", generateToken(userId)
    ).redirectOutput(Redirect.appendTo(new File("./scribe-output.log")))
     .redirectError(Redirect.appendTo(new File("./scribe-error.log")));
    final var startTimeMillis = System.currentTimeMillis();
    scribeProcess = pb.start();
    final var scribeTimeoutSeconds = Long.valueOf(
      Optional.ofNullable(System.getProperty("walletviews.test.scribe-start-timeout-seconds")).orElse("20")
    );
    logger.info("Waiting for scribe to start with timeout set to " + scribeTimeoutSeconds + " seconds");
    final var ledgerEnd = getLedgerEnd();
    logger.info("Ledger end: " + ledgerEnd);
    while (true) {
      java.net.http.HttpResponse<String> healthResponse = null;
      String checkPoint = null;
      Throwable error = null;
      final var client = HttpClient.newHttpClient();
      final var request = HttpRequest.newBuilder()
        .uri(URI.create("http://127.0.0.1:" + healthPort.toString() + "/livez"))
        .build();

      try {
        healthResponse = client.send(request, BodyHandlers.ofString());
        if (healthResponse.statusCode() == 200) {
          checkPoint = pqsCheckPoint();
          if (checkPoint != null) {
            logger.info("PQS checkpoint: " + checkPoint);
          }
        }
      } catch (Throwable t) {
        error = t;
      }

      if (
        healthResponse == null ||
        healthResponse.statusCode() != 200 ||
        checkPoint == null ||
        !ledgerEnd.equals(checkPoint)
      ) {
        if (((System.currentTimeMillis() - startTimeMillis) / 1000L) > scribeTimeoutSeconds || !scribeProcess.isAlive()) {
          if (error != null) {
            logger.error("Error starting scribe", error);
          }
          if (healthResponse != null) {
            logger.error("Error starting scribe (non-OK response):", healthResponse.toString());
          }
          throw new Exception("Failed to start scribe");
        } else {
          logger.info("Waiting for scribe to start...");
          Thread.sleep(1000L);
        }
      } else {
        logger.info("Scribe started successfully");
        break;
      }
    }

    final var dbConn = DriverManager.getConnection(
      postgresContainer.getJdbcUrl(),
      postgresContainer.getUsername(),
      postgresContainer.getPassword()
    );
    try {
      final var sr = new ScriptRunner(dbConn);
      sr.setSendFullScript(true);
      sr.setStopOnError(true);
      sr.setThrowWarning(true);
      final var reader = new BufferedReader(new FileReader(this.getClass().getResource("/db/functions.sql").getFile()));
      sr.runScript(reader);
    } finally {
      dbConn.close();
    }
  }

  private static String pqsCheckPoint() throws SQLException {
    String offset = null;
    Connection conn = DriverManager.getConnection(
      postgresContainer.getJdbcUrl(),
      postgresContainer.getUsername(),
      postgresContainer.getPassword()
    );

    try {
      PreparedStatement pstmt = conn.prepareStatement("SELECT \"offset\" FROM latest_checkpoint()");
      ResultSet rs = pstmt.executeQuery();

      if (rs.next()) {
        offset = rs.getString("offset");
      }
    } catch (SQLException e) {
      logger.warn("Error getting latest offset from PQS", e);
    } finally {
      conn.close();
    }

    return offset;
  }

  private static <T, D extends DefinedDataType<T>> String toJson(Result<List<D>> result) {
    final var jsonString = jsonCodec.toJsValue(
      result.toValue(
        values -> DamlList.of(
          values.stream().map(v -> v.toValue()).collect(Collectors.toList())
        )
      )
    ).compactPrint();
    final var json = new Gson().fromJson(jsonString, JsonObject.class);
    final var resultsArray = new JsonArray();
    json.get("result").getAsJsonArray().iterator().forEachRemaining(r -> {
      resultsArray.add(r.getAsJsonObject().get("unpack"));
    });
    // json.remove("result");
    json.add("result", resultsArray);
    return new Gson().toJson(json);
  }

  private static <T> String toJson(DefinedDataType<T> value) {
    return jsonCodec.toJsValue(value.toValue()).compactPrint();
  }

  private static Base.ContractId unlockHolding(Base.ContractId holdingCid, String context) {
    return allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForResult(allPartiesUpdateSubmission(holdingCid.exerciseRelease(context)))
      .blockingGet()
      .exerciseResult;
  }

  private static Account.ContractId updateAccount(
    AccountKey account,
    Controllers controllers,
    String description,
    Map<String, Set<String>> observers
  ) {
    final var tx = allPartiesLedgerClient
      .getCommandClient()
      .submitAndWaitForTransactionTree(
        allPartiesCommandSubmission(
          List.of(
            accountFactoryCid.exerciseRemove(account),
            accountFactoryCid.exerciseCreate(
              account,
              holdingFactoryCid,
              controllers,
              description,
              observers
            )
          )
        )
      ).blockingGet();
    final var exerciseCreateEvent = (ExercisedEvent) tx.getEventsById().get(tx.getRootEventIds().get(1));
    return new Account.ContractId(
      exerciseCreateEvent.getExerciseResult().asContractId().get().getValue()
    );
  }

  private static void uploadDarFile(String darFileName, ManagedChannel channel) throws IOException {
    // Upload dar
    final ByteString fileContent = createBufferInputStream(readResource(darFileName));
    final var packageManagementService = PackageManagementServiceGrpc.newBlockingStub(channel);
    packageManagementService.uploadDarFile(
      PackageManagementServiceOuterClass.UploadDarFileRequest
        .newBuilder()
        .setDarFile(fileContent)
        .build()
    );
  }

  private static HttpHeaders userTokenHeader(String user) {
    var headers = new HttpHeaders();
    headers.add("Authorization", "Bearer " + generateToken(user));
    return headers;
  }

  private static class AllocationResult {
    public final Instruction.ContractId instructionCid;
    public final Optional<Base.ContractId> allocatedHoldingCid;

    private AllocationResult(Instruction.ContractId instructionCid, Optional<Base.ContractId> allocatedHoldingCid) {
      this.instructionCid = instructionCid;
      this.allocatedHoldingCid = allocatedHoldingCid;
    }
  }

  private static class AuthClientInterceptor implements ClientInterceptor {
    private final String token;
    public AuthClientInterceptor(String token) {
      this.token = token;
    }

    @Override
    public <ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
      MethodDescriptor<ReqT, RespT> method, CallOptions callOptions, Channel next) {

      return new ForwardingClientCall.SimpleForwardingClientCall<>(
        next.newCall(method, callOptions)) {

        @Override
        public void start(Listener<RespT> responseListener, Metadata headers) {
          Metadata fixedHeaders = new Metadata();
          fixedHeaders.put(Metadata.Key.of("Authorization", Metadata.ASCII_STRING_MARSHALLER), "Bearer " + token);
          headers.merge(fixedHeaders);

          super.start(
            new ForwardingClientCallListener.SimpleForwardingClientCallListener<>(
              responseListener) {
              @Override
              public void onHeaders(Metadata headers) {
                /**
                 * if you don't need receive header from server, you can use {@link
                 * io.grpc.stub.MetadataUtils attachHeaders} directly to send header
                 */
                super.onHeaders(headers);
              }
            },
            headers);
        }
      };
    }
  }

  private static class CreateBatchResult {
    public final Batch.ContractId batchCid;
    public final List<Instruction.ContractId> instructionCids;
    public final List<Id> instructionIds;
    public final String offset;

    private CreateBatchResult(
      Batch.ContractId batchCid,
      List<Instruction.ContractId> instructionCids,
      List<Id> instructionIds,
      String offset
    ) {
      this.batchCid = batchCid;
      this.instructionCids = instructionCids;
      this.instructionIds = instructionIds;
      this.offset = offset;
    }
  }
}
