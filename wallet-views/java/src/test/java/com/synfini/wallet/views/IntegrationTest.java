package com.synfini.wallet.views;

import com.daml.ledger.api.v1.admin.*;
import com.daml.ledger.javaapi.data.*;
import com.daml.ledger.javaapi.data.codegen.DefinedDataType;
import com.daml.ledger.javaapi.data.codegen.HasCommands;
import com.daml.ledger.javaapi.data.codegen.Update;
import com.daml.ledger.rxjava.DamlLedgerClient;
import com.daml.lf.codegen.json.JsonCodec;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.google.protobuf.ByteString;
import da.set.types.Set;
import daml.finance.interface$.account.account.Account;
import daml.finance.interface$.account.account.Controllers;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.holding.fungible.Fungible;
import daml.finance.interface$.holding.fungible.SplitResult;
import daml.finance.interface$.settlement.batch.Batch;
import daml.finance.interface$.settlement.factory.Instruct;
import daml.finance.interface$.settlement.instruction.Instruction;
import daml.finance.interface$.settlement.types.Allocation;
import daml.finance.interface$.settlement.types.Approval;
import daml.finance.interface$.settlement.types.RoutedStep;
import daml.finance.interface$.settlement.types.allocation.Pledge;
import daml.finance.interface$.settlement.types.approval.TakeDelivery;
import io.grpc.*;
import io.grpc.MethodDescriptor;
import kong.unirest.*;
import org.springframework.http.HttpHeaders;
import synfini.wallet.api.types.*;
import com.synfini.wallet.views.projection.ProjectionRunner;
import daml.finance.interface$.account.account.Credit;
import daml.finance.interface$.holding.base.Lock;
import daml.finance.interface$.holding.base.LockType;
import daml.finance.interface$.holding.base.View;
import daml.finance.interface$.types.common.types.AccountKey;
import daml.finance.interface$.types.common.types.Id;
import daml.finance.interface$.types.common.types.InstrumentKey;
import daml.finance.interface$.types.common.types.Quantity;
import io.grpc.netty.NettyChannelBuilder;
import org.junit.jupiter.api.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import picocli.CommandLine;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
  webEnvironment = SpringBootTest.WebEnvironment.MOCK,
  classes = SpringApplication.class)
@AutoConfigureMockMvc
public class IntegrationTest {
  private static final Logger logger = LoggerFactory.getLogger(IntegrationTest.class);
  private static final String mockTokenUrl = "https://myauth.com/token";
  private static MockClient mockTokenClient;
  private static final String tokenAudience =
    "https://daml.com/jwt/aud/participant/sandbox::1220facc0504d0689c876c616736695a92dbdd54a2aad49cc7a8b2f54935604c35ac";
  private static final String clientSecret = "secret";
  private static Path clientSecretFile;
  private static Integer sandboxPort;
  private static Process sandboxProcess;
  private static String custodian;
  private static String custodianUser;
  private static String investor1;
  private static String investor1User;
  private static String investor2;
  private static String investor2User;
  private static String allPartiesUser;
  private static ManagedChannel allPartiesChannel;
  private static ManagedChannel adminChannel;
  private static DamlLedgerClient allPartiesLedgerClient;
  private static final List<ExecutorService> projectionExecutorServices = new ArrayList<>();
  private static final List<Future<Integer>> projectionDaemonFutures = new ArrayList<>();
  private static final InstrumentKey instrument1 = new InstrumentKey(
    "someDepository",
    "someIssuer",
    new Id("someId"),
    "someVersion"
  );
  private static final InstrumentKey instrument2 = new InstrumentKey(
    "someDepository",
    "someIssuer",
    new Id("someId"),
    "someVersion2"
  );
  @Value("${spring.datasource.url}")
  private String springDataSourceUrl;
  @Value("${spring.datasource.username}")
  private String springDataSourceUsername;
  @Value("${spring.datasource.password}")
  private String springDataSourcePassword;
  private static Path dbPasswordFile;
  private static daml.finance.interface$.account.factory.Factory.ContractId accountFactoryCid;
  private static daml.finance.interface$.holding.factory.Factory.ContractId holdingFactoryCid;
  private static daml.finance.interface$.settlement.factory.Factory.ContractId settlementFactoryCid;

  @Autowired
  private MockMvc mvc;

  @BeforeAll
  public static void beforeAll() throws Exception {
    ServerSocket socket = new ServerSocket(0);
    sandboxPort = socket.getLocalPort();
    System.setProperty("walletviews.ledger-port", sandboxPort.toString());
    ServerSocket adminApiSocket = new ServerSocket(0);
    Integer adminApiPort = adminApiSocket.getLocalPort();
    ServerSocket domainPublicSocket= new ServerSocket(0);
    Integer domainPublicPort = domainPublicSocket.getLocalPort();
    ServerSocket domainAdminSocket = new ServerSocket(0);
    Integer domainAdminPort = domainAdminSocket.getLocalPort();
    socket.close();
    adminApiSocket.close();
    domainPublicSocket.close();
    domainAdminSocket.close();

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
    sandboxProcess = pb.start();

    final var lastAttempt = 20;
    for (int attempt = 1; attempt <= lastAttempt; attempt++) {
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
            "daml-finance-settlement.dar"
          )
        ) {
          uploadDarFile(darFileName, adminChannel);
        }
        logger.info("Sandbox setup complete");
        break;
      } catch (StatusRuntimeException statusRuntimeException) {
        final var isUnavailable = statusRuntimeException.getStatus().getCode().equals(Status.UNAVAILABLE.getCode()) ||
          statusRuntimeException.getMessage().contains("PARTY_ALLOCATION_WITHOUT_CONNECTED_DOMAIN");
        if (!isUnavailable || attempt == lastAttempt) {
          logger.error(
            "Failed to connect to sandbox after " + attempt + " attempts. Please check logs under " + sandboxDir
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

    clientSecretFile = Files.createTempFile("wallet-views-test-client-secret", null);
    Files.write(clientSecretFile, clientSecret.getBytes(StandardCharsets.UTF_8));
  }

  @AfterAll
  static void afterAll() throws InterruptedException, IOException {
    if (adminChannel != null) {
      shutdownChannel(adminChannel);
    }

    if (sandboxProcess != null) {
      logger.info("Shutting down sandbox...");
      sandboxProcess.destroy();
      sandboxProcess.waitFor(15, TimeUnit.SECONDS);
      if (sandboxProcess.isAlive()) {
        throw new IllegalStateException("Failed to shutdown sandbox");
      }
    }

    Files.delete(clientSecretFile);
    Files.delete(dbPasswordFile);
  }

  @BeforeEach
  void beforeEach() throws Exception {
    if (dbPasswordFile == null) {
      dbPasswordFile = Files.createTempFile("wallet-views-test-db-password", null);
      Files.write(dbPasswordFile,  springDataSourcePassword.getBytes(StandardCharsets.UTF_8));
    }

    mockTokenClient = MockClient.register();
    mockTokenClient.defaultResponse().thenReturn("Did not match any expected responses").withStatus(400);
    // Allocate parties
    final var partyManagementService = PartyManagementServiceGrpc.newBlockingStub(adminChannel);
    custodian = partyManagementService.allocateParty(
      PartyManagementServiceOuterClass.AllocatePartyRequest.newBuilder().setDisplayName("Custodian").build()
    ).getPartyDetails().getParty();
    investor1 = partyManagementService.allocateParty(
      PartyManagementServiceOuterClass.AllocatePartyRequest.newBuilder().setDisplayName("Investor1").build()
    ).getPartyDetails().getParty();
    investor2 = partyManagementService.allocateParty(
      PartyManagementServiceOuterClass.AllocatePartyRequest.newBuilder().setDisplayName("Investor2").build()
    ).getPartyDetails().getParty();

    // Create users
    final var entropy = UUID.randomUUID().toString();
    custodianUser = "custodian-" + entropy;
    investor1User = "investor1-" + entropy;
    investor2User = "investor2-" + entropy;
    allPartiesUser = "all-parties-user-" + entropy;
    final var adminLedgerClient = DamlLedgerClient.newBuilder(adminChannelBuilder()).build();
    adminLedgerClient.connect();
    final var userManagementClient = adminLedgerClient.getUserManagementClient();
    userManagementClient.createUser(new CreateUserRequest(custodianUser, custodian)).blockingGet();
    userManagementClient.createUser(new CreateUserRequest(investor1User, investor1)).blockingGet();
    userManagementClient.createUser(new CreateUserRequest(investor2User, investor2)).blockingGet();
    userManagementClient.createUser(
      new CreateUserRequest(
        new User(allPartiesUser, custodian),
        new User.Right.CanActAs(custodian),
        new User.Right.CanActAs(investor1),
        new User.Right.CanActAs(investor2)
      )
    ).blockingGet();
    adminLedgerClient.close();

    final var allPartiesChannelBuilder = sandboxChannelBuilder()
      .intercept(new AuthClientInterceptor(generateToken(allPartiesUser)));
    allPartiesChannel = allPartiesChannelBuilder.build();
    allPartiesLedgerClient = DamlLedgerClient.newBuilder(allPartiesChannelBuilder).build();
    allPartiesLedgerClient.connect();

    final var obs = arrayToSet(investor1, investor2);
    final var obsMap = Collections.singletonMap("investors", obs);
    final var accountFactory = new daml.finance.account.account.Factory(custodian, obsMap);
    final var holdingFactory = new daml.finance.holding.fungible.Factory(custodian, obsMap);
    final var settlementFactory = new daml.finance.settlement.factory.Factory(custodian, obs);
    accountFactoryCid = new daml.finance.interface$.account.factory.Factory.ContractId(
      allPartiesLedgerClient
        .getCommandClient()
        .submitAndWaitForResult(allPartiesUpdateSubmission(accountFactory.create()))
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
  }

  @AfterEach
  void afterEach() throws Exception {
    logger.info("Shutting down projection executors");
    for (ExecutorService projectionExecutorService : projectionExecutorServices) {
      projectionExecutorService.shutdownNow();
      if (!projectionExecutorService.awaitTermination(8, TimeUnit.SECONDS)) {
        logger.warn("Timed out waiting for projection runner to stop");
      }
    }
    for (Future<Integer> f : projectionDaemonFutures) {
      final var exitCode = f.get();
      if (exitCode != 0) {
        throw new Exception("Projection daemon exited with non-zero exit code: " + exitCode);
      }
    }
    projectionExecutorServices.clear();
    projectionDaemonFutures.clear();
    if (allPartiesChannel != null) {
      shutdownChannel(allPartiesChannel);
    }
    if (allPartiesLedgerClient != null) {
      allPartiesLedgerClient.close();
    }

    mockTokenClient.reset();
  }

  @Test
  void testHasNoBalancesInitially() throws Exception {
    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();

    final var account = new AccountKey(custodian, investor1, new Id("1"));

    // Check balances if account does not exist
    userTokenHeader(investor1User);
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Balances(Collections.emptyList()))));

    // Create new account and check balances
    createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    delayForLedger();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Balances(Collections.emptyList()))));
  }

  @Test
  void testUpdatesBalanceAfterCreditsAndDebits() throws Exception {
    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();

    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var creditAmount = new BigDecimal("99.0");
    creditAccount(accountCid, instrument1, creditAmount);
    delayForLedger();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(
                Collections.singletonList(new Balance(account, instrument1, creditAmount, BigDecimal.ZERO))
              )
            )
          )
      );

    final var holdingCid_1_01 = creditAccount(accountCid, instrument1, new BigDecimal("1.01"));
    delayForLedger();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(
                Collections.singletonList(
                  new Balance(account, instrument1, new BigDecimal("100.01"), BigDecimal.ZERO)
                )
              )
            )
          )
      );

    // Archive a Holding which was created before the previous time the balance was calculated
    final var splitResult = splitHolding(
      new Fungible.ContractId(holdingCid_1_01.contractId),
      List.of(new BigDecimal("0.01"))
    );
    debitAccount(accountCid, new Base.ContractId(splitResult.splitCids.get(0).contractId));

    // Credit + debit the account (causing no change to balance)
    final var holdingCid_5 = creditAccount(accountCid, instrument1, new BigDecimal("5.0"));
    debitAccount(accountCid, holdingCid_5);

    // Credit account
    creditAccount(accountCid, instrument1, new BigDecimal("5.0"));
    delayForLedger();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(
                Collections.singletonList(
                  new Balance(account, instrument1, new BigDecimal("105.0"), BigDecimal.ZERO)
                )
              )
            )
          )
      );
    // Balance is now cached and should return the same result
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(
                Collections.singletonList(
                  new Balance(account, instrument1, new BigDecimal("105.0"), BigDecimal.ZERO)
                )
              )
            )
          )
      );
  }

  @Test
  void testHasSameBalanceAfterSplit() throws Exception {
    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();

    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var creditAmount = new BigDecimal("99.0");
    final var holdingCid = creditAccount(accountCid, instrument1, creditAmount);
    splitHolding(
      new daml.finance.interface$.holding.fungible.Fungible.ContractId(holdingCid.contractId),
      List.of(new BigDecimal("42.1"), new BigDecimal("0.01"))
    );
    delayForLedger();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(Collections.singletonList(new Balance(account, instrument1, creditAmount, BigDecimal.ZERO)))
            )
          )
      );
  }

  @Test
  void returnsLockedBalances() throws Exception {
    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();

    final var account = new AccountKey(custodian, investor1, new Id("1"));
    final var creditAmount= new BigDecimal("99.0");
    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var holdingCid = creditAccount(accountCid, instrument1, creditAmount);

    final var lockedHoldingCid1 = lockHolding(holdingCid, arrayToSet(custodian), "ctx", LockType.REENTRANT);
    delayForLedger();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(Collections.singletonList(new Balance(account, instrument1, BigDecimal.ZERO, creditAmount)))
            )
          )
      );

    // Lock again with different lock context
    final var lockedHoldingCid2 = lockHolding(lockedHoldingCid1, arrayToSet(custodian), "ctx2", LockType.REENTRANT);
    delayForLedger();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(Collections.singletonList(new Balance(account, instrument1, BigDecimal.ZERO, creditAmount)))
            )
          )
      );

    // Remove both locks
    final var unlockedHoldingCid = unlockHolding(
      unlockHolding(lockedHoldingCid2, "ctx"),
      "ctx2"
    );
    // Lock part of the balance
    final var lockAmount = new BigDecimal("1.0");
    final var splitResult = splitHolding(new Fungible.ContractId(unlockedHoldingCid.contractId), List.of(lockAmount));
    lockHolding(
      new Base.ContractId(splitResult.splitCids.get(0).contractId),
      arrayToSet(custodian),
      "ctx",
      LockType.SEMAPHORE
    );
    delayForLedger();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(
                Collections.singletonList(
                  new Balance(account, instrument1, creditAmount.subtract(lockAmount), lockAmount)
                )
              )
            )
          )
      );
  }

  @Test
  void canReturnBalancesOfMultipleAssets() throws Exception {
    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();

    final var account = new AccountKey(custodian, investor1, new Id("1"));
    final var creditAmount1 = new BigDecimal("99.0");
    final var creditAmount2 = new BigDecimal("0.001");

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    creditAccount(accountCid, instrument1, creditAmount1);
    creditAccount(accountCid, instrument2, creditAmount2);
    delayForLedger();
    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(
                List.of(
                  new Balance(account, instrument1, creditAmount1, BigDecimal.ZERO),
                  new Balance(account, instrument2, creditAmount2, BigDecimal.ZERO)
                )
              )
            )
          )
      );
  }

  @Test
  void doesNotReturnBalancesOfOtherAccounts() throws Exception {
    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();

    final var account1 = new AccountKey(custodian, investor1, new Id("1"));
    final var account2 = new AccountKey(custodian, investor1, new Id("2"));
    final var creditAmount = new BigDecimal("1.0");

    final var accountCid1 = createAccount(account1, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    creditAccount(accountCid1, instrument1, creditAmount);

    final var accountCid2 = createAccount(account2, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    creditAccount(accountCid2, instrument1, creditAmount);

    delayForLedger();

    mvc
      .perform(getBalanceByAccountBuilder(account1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(
                Collections.singletonList(
                  new Balance(account1, instrument1, creditAmount, BigDecimal.ZERO)
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
    creditAccount(accountCid, instrument1, creditAmount);
    delayForLedger();

    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();

    mvc
      .perform(getBalanceByAccountBuilder(account).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Balances(
                Collections.singletonList(new Balance(account, instrument1, creditAmount, BigDecimal.ZERO))
              )
            )
          )
      );
  }

  @Test
  void returnsHoldings() throws Exception {
    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();
    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var creditAmount = new BigDecimal("99.0");
    final var holdingCid = creditAccount(accountCid, instrument1, creditAmount);
    final var ledgerOffset = getLedgerEnd();
    delayForLedger();

    mvc
      .perform(getHoldingsBuilder(account, instrument1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Holdings(
                Collections.singletonList(
                  new HoldingSummary(
                    holdingCid,
                    new View(instrument1, account, creditAmount, Optional.empty()),
                    Optional.of(new TransactionDetail(ledgerOffset, Instant.EPOCH))
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
    delayForLedger();

    final var expectedLock = new Lock(arrayToSet(custodian, investor2), arrayToSet(lockContext), lockType);
    mvc
      .perform(getHoldingsBuilder(account, instrument1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content()
          .json(
            toJson(
              new Holdings(
                Collections.singletonList(
                  new HoldingSummary(
                    lockedHoldingCid, new View(instrument1, account, creditAmount, Optional.of(expectedLock)),
                    Optional.of(new TransactionDetail(newLedgerOffset, Instant.EPOCH))
                  )
                )
              )
            )
          )
      );
  }

  @Test
  void returnsAccounts() throws Exception {
    registerAuthMock(custodianUser, 60 * 60 * 24);
    startProjectionDaemon(custodian, custodianUser);
    delayForProjectionToStart();

    mvc
      .perform(getAccountsBuilder(investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Accounts(Collections.emptyList()))));

    final var account = new AccountKey(custodian, investor1, new Id("1"));

    final var accountCid = createAccount(account, List.of(investor1), Collections.emptyList(), Collections.emptyList());
    final var createOffset = getLedgerEnd();
    delayForLedger();

    mvc
      .perform(getAccountsBuilder(investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(
            new Accounts(
              Collections.singletonList(
                new AccountSummary(
                  accountCid,
                  new daml.finance.interface$.account.account.View(
                    account.custodian,
                    account.owner,
                    account.id,
                    "Testing account",
                    holdingFactoryCid,
                    new Controllers(arrayToSet(investor1), arrayToSet())
                  ),
                  Optional.of(new TransactionDetail(createOffset, Instant.EPOCH)),
                  Optional.empty()
              )
            )
          )
        )
      )
    );

    mvc
      .perform(getAccountsBuilder(investor2).headers(userTokenHeader(investor2User)))
      .andExpect(status().isOk())
      .andExpect(content().json(toJson(new Accounts(Collections.emptyList()))));

    final Map<String, Set<String>> obs = new HashMap<>();
    final var newControllers = new Controllers(arrayToSet("X"), arrayToSet("Y"));
    final var newDescription = "new desc";
    final var newAccountCid = updateAccount(account, newControllers, newDescription, obs);
    delayForLedger();

    mvc
      .perform(getAccountsBuilder(investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(
            new Accounts(
              Collections.singletonList(
                new AccountSummary(
                  newAccountCid,
                  new daml.finance.interface$.account.account.View(
                    account.custodian,
                    account.owner,
                    account.id,
                    newDescription,
                    holdingFactoryCid,
                    newControllers
                  ),
                  Optional.of(new TransactionDetail(createOffset, Instant.EPOCH)),
                  Optional.empty()
                )
              )
            )
          )
        )
      );

    removeAccount(account);
    final var removeOffset = getLedgerEnd();
    delayForLedger();

    mvc
      .perform(getAccountsBuilder(investor1).headers(userTokenHeader(investor1User)))
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(
            new Accounts(
              Collections.singletonList(
                new AccountSummary(
                  newAccountCid,
                  new daml.finance.interface$.account.account.View(
                    account.custodian,
                    account.owner,
                    account.id,
                    newDescription,
                    holdingFactoryCid,
                    newControllers
                  ),
                  Optional.of(new TransactionDetail(createOffset, Instant.EPOCH)),
                  Optional.of(new TransactionDetail(removeOffset, Instant.EPOCH))
                )
              )
            )
          )
        )
      );
  }

  @Test
  void returnsSingleSettlement() throws Exception {
    registerAuthMock(investor2User, 60 * 60 * 24);
    startProjectionDaemon(investor2, investor2User);
    delayForProjectionToStart();

    final var investor1Account = new AccountKey(custodian, investor1, new Id("1"));
    final var investor1AccountCid = createAccount(investor1Account, List.of(investor1), List.of(), List.of());
    final var investor2Account = new AccountKey(custodian, investor2, new Id("2"));
    createAccount(investor2Account, List.of(investor2), List.of(), List.of(investor1));
    final var amount = new BigDecimal("100.0");
    final var investor1HoldingCid = creditAccount(investor1AccountCid, instrument1, amount);

    final var batchId = new Id("batch1");
    final var description = "tx description";
    final Optional<Id> contextId = Optional.empty();
    final var routedStep = new RoutedStep(investor1, investor2, custodian, new Quantity<>(instrument1, amount));
    final var requestors = arrayToSet(investor1);
    final var settlers = requestors;
    final var createBatchResult = createBatch(
      new Instruct(
        requestors,
        settlers,
        batchId,
        description,
        contextId,
        List.of(routedStep),
        Optional.empty()
      )
    );
    final var allocation = new Pledge(investor1HoldingCid);
    final var allocationResult = allocate(createBatchResult.instructionCids.get(0), allocation, List.of(investor1));
    final var approval = new TakeDelivery(investor2Account);
    final var approvedInstructionCid = approve(allocationResult.instructionCid, approval, List.of(investor2));
    settleBatch(createBatchResult.batchCid, List.of(investor1));
    final var settleOffset = getLedgerEnd();
    delayForLedger();

    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.empty())
          .headers(userTokenHeader(investor2User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(
            new Settlements(
              List.of(
                new SettlementSummary(
                  batchId,
                  requestors,
                  Optional.empty(),
                  contextId,
                  Optional.empty(),
                  List.of(
                    new SettlementStep(
                      routedStep,
                      createBatchResult.instructionIds.get(0),
                      approvedInstructionCid,
                      Optional.of(new Pledge(allocationResult.allocatedHoldingCid.get())),
                      Optional.of(approval)
                    )
                  ),
                  new TransactionDetail(createBatchResult.offset, Instant.EPOCH),
                  Optional.of(new TransactionDetail(settleOffset, Instant.EPOCH))
                )
              )
            )
          )
        )
      );

    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.empty())
          .headers(userTokenHeader(custodianUser))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(toJson(new Settlements(List.of())))
      );
  }

  @Test
  void returnsMultipleSettlements() throws Exception {
    registerAuthMock(investor1User, 60 * 60 * 24);
    startProjectionDaemon(investor1, investor1User);
    delayForProjectionToStart();

    final var investor1Account = new AccountKey(custodian, investor1, new Id("1"));
    final var investor1AccountCid = createAccount(investor1Account, List.of(investor1), List.of(), List.of());
    final var investor2Account = new AccountKey(custodian, investor2, new Id("2"));
    createAccount(investor2Account, List.of(investor2), List.of(), List.of(investor1));
    final var amount = new BigDecimal("100.0");
    final var investor1HoldingCid = creditAccount(investor1AccountCid, instrument1, amount);

    // BEGIN batch 1
    final var batch1Id = new Id("batch1");
    final var description1 = "tx description";
    final Optional<Id> contextId1 = Optional.empty();
    final var routedStep1 = new RoutedStep(investor1, investor2, custodian, new Quantity<>(instrument1, amount));
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
    final var routedStep2 = new RoutedStep(investor2, investor1, custodian, new Quantity<>(instrument1, amount));
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

    delayForLedger();

    final var settlement1 = new SettlementSummary(
      batch1Id,
      requestors1,
      Optional.of(createBatchResult1.batchCid),
      contextId1,
      Optional.of(description1),
      List.of(
        new SettlementStep(
          routedStep1,
          createBatchResult1.instructionIds.get(0),
          approvedInstructionCid1,
          Optional.of(new Pledge(allocationResult1.allocatedHoldingCid.get())),
          Optional.of(approval1)
        )
      ),
      new TransactionDetail(createBatchResult1.offset, Instant.EPOCH),
      Optional.of(new TransactionDetail(settleOffset1, Instant.EPOCH))
    );

    final var settlement2 = new SettlementSummary(
      batch2Id,
      requestors2,
      Optional.of(createBatchResult2.batchCid),
      contextId2,
      Optional.of(description2),
      List.of(
        new SettlementStep(
          routedStep2,
          createBatchResult2.instructionIds.get(0),
          approvedInstruction2Cid,
          Optional.empty(),
          Optional.of(approval2)
        )
      ),
      new TransactionDetail(createBatchResult2.offset, Instant.EPOCH),
      Optional.empty()
    );
    final var settlement2VisibleToCustodian = new SettlementSummary(
      settlement2.batchId,
      settlement2.requestors,
      Optional.empty(),
      Optional.empty(),
      Optional.empty(),
      settlement2.steps,
      new TransactionDetail(approval2LedgerOffset, Instant.EPOCH),
      Optional.empty()
    );

    mvc
      .perform(
        getSettlementsBuilder(Optional.empty(), Optional.empty())
          .headers(userTokenHeader(investor1User))
      )
      .andExpect(status().isOk())
      .andExpect(
        content().json(
          toJson(new Settlements(List.of(settlement1, settlement2)))
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
          toJson(new Settlements(List.of(settlement1)))
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
          toJson(new Settlements(List.of(settlement2)))
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
          toJson(new Settlements(List.of(settlement2VisibleToCustodian)))
        )
      );
  }

  @Test
  void deniesAccessWithoutToken() throws Exception {
    mvc
      .perform(getAccountsBuilder(investor1))
      .andExpect(status().isUnauthorized());

    mvc
      .perform(
        getBalanceByAccountBuilder(new AccountKey(custodian, investor1, new Id("1")))
      )
      .andExpect(status().isUnauthorized());

    mvc
      .perform(
        getHoldingsBuilder(
          new AccountKey(custodian, investor1, new Id("1")), instrument1
        )
      )
      .andExpect(status().isUnauthorized());
  }

  @Test
  void deniesAccessToOtherParties() throws Exception {
    mvc
      .perform(getAccountsBuilder(investor1).headers(userTokenHeader(investor2User)))
      .andExpect(status().isForbidden());

    mvc
      .perform(
        getBalanceByAccountBuilder(
          new AccountKey(custodian, investor1, new Id("1"))
        ).headers(userTokenHeader(investor2User))
      )
      .andExpect(status().isForbidden());

    mvc
      .perform(
        getHoldingsBuilder(
          new AccountKey(custodian, investor1, new Id("1")), instrument1
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

  private static CommandsSubmission allPartiesCommandSubmission(List<? extends HasCommands> commands) {
    return CommandsSubmission
      .create(allPartiesUser, UUID.randomUUID().toString(), commands)
      .withActAs(List.of(custodian, investor1, investor2));
  }

  private static <U> UpdateSubmission<U> allPartiesUpdateSubmission(Update<U> update) {
    return UpdateSubmission
      .create(allPartiesUser, UUID.randomUUID().toString(), update)
      .withActAs(List.of(custodian, investor1, investor2));
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

  // Delay used to account for possible lag between when an event is added to ledger, and custom views writing the event
  // to the DB
  private static void delayForLedger() throws InterruptedException {
    Thread.sleep(8_000);
  }

  // Delay to account for time taken for the projector to start
  private static void delayForProjectionToStart() throws InterruptedException {
    Thread.sleep(12_000);
    logger.info("Finished delay for projection");
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

  private static MockHttpServletRequestBuilder getAccountsBuilder(String owner) {
    return MockMvcRequestBuilders
      .post("/v1/accounts")
      .content(toJson(new AccountFilter(owner)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getBalanceByAccountBuilder(AccountKey account) {
    return MockMvcRequestBuilders
      .post("/v1/balance")
      .content(toJson(new BalanceFilter(account)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getHoldingsBuilder(AccountKey account, InstrumentKey instrument) {
    return MockMvcRequestBuilders
      .post("/v1/holdings")
      .content(toJson(new HoldingFilter(account, instrument)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static MockHttpServletRequestBuilder getSettlementsBuilder(
    Optional<String> before,
    Optional<Long> limit
  ) {
    return MockMvcRequestBuilders
      .post("/v1/settlements")
      .content(toJson(new SettlementsFilter(before, limit)))
      .contentType(MediaType.APPLICATION_JSON);
  }

  private static String getLedgerEnd() {
    return (
      (LedgerOffset.Absolute) allPartiesLedgerClient.getTransactionsClient().getLedgerEnd().blockingGet()
    ).getOffset();
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

  // Register this client ID in a mocked IAM, which will issue tokens within the given expiry
  private static void registerAuthMock(String clientId, int expiresInSeconds) {
    JsonObject resp = new JsonObject();
    resp.add("access_token", new JsonPrimitive(generateToken(clientId)));
    resp.add("expires_in", new JsonPrimitive(expiresInSeconds));

    FieldMatcher expectedFields = FieldMatcher.of(
      "client_id", clientId,
      "client_secret", clientSecret,
      "audience", tokenAudience
    );
    // The Mock IAM will only return the response if it receives a request which matches the expected HTTP method, URL
    // and body.
    mockTokenClient
      .expect(HttpMethod.POST, mockTokenUrl)
      .body(
        new BodyMatcher() {
          @Override
          public MatchStatus matches(List<String> list) {
            // The provided Matcher does not work when the parameters are separated by "&", so we split it first, then
            // use the provided Matcher
            List<String> splitted = List.of(list.get(0).split("&"));
            return expectedFields.matches(splitted);
          }
        }
      )
      .thenReturn(resp)
      .withStatus(200);
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

  private void startProjectionDaemon(String readAs, String clientId) throws InterruptedException {
    ExecutorService projectionExecutorService = Executors.newSingleThreadExecutor();
    Future<Integer> projectionDaemonFuture = projectionExecutorService.submit(new Callable<Integer>() {
      @Override
      public Integer call() {
        return new CommandLine(new ProjectionRunner()).execute(
          "--ledger-host", "127.0.0.1",
          "--ledger-port", sandboxPort.toString(),
          "--ledger-plaintext",
          "--db-url", springDataSourceUrl,
          "--db-user", springDataSourceUsername,
          "--db-password-file", dbPasswordFile.toString(),
          "--token-url", mockTokenUrl,
          "--token-client-id", clientId,
          "--token-client-secret-file", clientSecretFile.toString(),
          "--token-audience", tokenAudience,
          "--token-refresh-window-seconds", "120",
          "--read-as", readAs
        );
      }
    });
    projectionExecutorServices.add(projectionExecutorService);
    projectionDaemonFutures.add(projectionDaemonFuture);
  }

  private static <T> String toJson(DefinedDataType<T> value) {
    return JsonCodec.apply(true, true).toJsValue(value.toValue()).prettyPrint();
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
