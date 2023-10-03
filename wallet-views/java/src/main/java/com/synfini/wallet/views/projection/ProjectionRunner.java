package com.synfini.wallet.views.projection;

import akka.actor.ActorSystem;
import akka.grpc.GrpcClientSettings;
import com.daml.projection.JdbcAction;
import com.daml.projection.JdbcProjector;
import com.daml.projection.javadsl.Control;
import com.daml.projection.javadsl.Projector;
import com.synfini.wallet.views.projection.generators.account.AccountFactoryEventsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.account.AccountsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.batch.BatchesProjectionGenerator;
import com.synfini.wallet.views.projection.generators.holding.HoldingsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.instruction.InstructionExecutionsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.instruction.InstructionsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.instrument.PbaProjectionGenerator;
import com.synfini.wallet.views.projection.generators.instrument.TokenProjectionGenerator;
import com.synfini.wallet.views.projection.generators.witness.WitnessProjectionGenerator;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import daml.finance.interface$.settlement.batch.Batch;
import daml.finance.interface$.settlement.instruction.Instruction;
import io.grpc.Status;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CancellationException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

public class ProjectionRunner implements Callable<Integer> {
  private static final Logger logger = LoggerFactory.getLogger(ProjectionRunner.class);

  @CommandLine.Option(
    names = "--ledger-host",
    description = "Host of the ledger",
    required = true
  )
  private static String ledgerHost;

  @CommandLine.Option(
    names = "--ledger-port",
    description = "Port of the ledger",
    required = true
  )
  private static int ledgerPort;

  @CommandLine.Option(
    names = "--ledger-plaintext",
    description = "Use plaintext when connecting to the ledger API",
    defaultValue = "false"
  )
  private static boolean ledgerPlaintext;

  @CommandLine.Option(
    names = "--db-url",
    description = "JDBC url of the database",
    required = true
  )
  private static String jdbcUrl;
  @CommandLine.Option(
    names = "--db-user",
    description = "Database username",
    required = true
  )
  private static String dbUser;

  @CommandLine.Option(
    names = "--db-password-file",
    description = "File containing database password",
    required = true
  )
  private static String dbPasswordFile;

  @CommandLine.Option(
    names = "--token-url",
    description = "Url of the endpoint used to fetch ledger API Jwt tokens",
    required = false
  )
  private static String tokenUrl;

  @CommandLine.Option(
    names = "--token-client-id",
    description = "Client ID used when fetching ledger API Jwt tokens",
    required = false
  )
  private static String clientId;

  @CommandLine.Option(
    names = "--token-client-secret-file",
    description = "File containing secret used when fetching ledger API Jwt tokens",
    required = false
  )
  private static String clientSecretFile;

  @CommandLine.Option(
    names = "--token-audience",
    description = "Audience used when fetching ledger API Jwt tokens",
    required = false
  )
  private static String audience;

  @CommandLine.Option(
    names = "--token-refresh-window-seconds",
    description = "If the token is about to expire within this amount of time, then the application will fetch a fresh token",
    required = false,
    defaultValue = "600"
  )
  private static Long tokenRefreshWindowSeconds;

  @CommandLine.Option(
    names = "--retry-policy-limit",
    description = "Maximum number of retries used if projection fails",
    defaultValue = "5"
  )
  private static Integer maxRetries;

  @CommandLine.Option(
    names = "--retry-policy-window-seconds",
    description = "After this amount of time the retry counter is set back to zero",
    defaultValue = "60"
  )
  private static Integer retryWindowSeconds;

  @CommandLine.Option(
    names = "--retry-policy-delay-seconds",
    description = "Delay between retries",
    defaultValue = "5"
  )
  private static Integer retryDelaySeconds;

  @CommandLine.Option(
    names = "--read-as",
    description = "Party to use when reading events from the ledger",
    required = true
  )
  private static String readAs;

  public static void main(String[] args) {
    System.exit(new CommandLine(new ProjectionRunner()).execute(args));
  }

  @Override
  public Integer call() throws Exception {
    final var dbPassword = Files.readString(Path.of(dbPasswordFile));

    // setup datasource and projection table
    final var dbConfig = new HikariConfig();
    dbConfig.setJdbcUrl(jdbcUrl);
    dbConfig.setUsername(dbUser);
    dbConfig.setPassword(dbPassword);
    dbConfig.setMaximumPoolSize(22); // TODO this should be set based on the number projections (e.g. 2 * numProjections)

    final Optional<SharedTokenCallCredentials> tokenCreds;
    if (tokenUrl != null) {
      if (clientId == null || audience == null || clientSecretFile == null) {
        logger.error("Please provide --token-client-id, --token-audience and --token-client-secret-file");
        return 1;
      }
      final var clientSecret = Files.readString(Path.of(clientSecretFile));
      tokenCreds = Optional.of(
        new SharedTokenCallCredentials(tokenUrl, clientId, clientSecret, audience, tokenRefreshWindowSeconds)
      );
    } else {
      logger.warn("--token-url not set: continuing without authentication");
      tokenCreds = Optional.empty();
    }

    int numRetries = 0;
    while (true) {
      final var startSeconds = System.currentTimeMillis() / 1000L;
      final var result = runProjections(dbConfig, tokenCreds);
      final var endSeconds = System.currentTimeMillis() / 1000L;
      if (endSeconds - startSeconds > retryWindowSeconds) {
        numRetries = 0;
      }
      if (!result.shouldRetry || numRetries >= maxRetries) {
        return result.exitCode;
      } else {
        Thread.sleep(retryDelaySeconds * 1000L);
        logger.info("Restarting projections");
        numRetries++;
      }
    }
  }

  private ProjectionResult runProjections(
    HikariConfig dbConfig,
    Optional<SharedTokenCallCredentials> tokenCallCredentials
  ) throws Exception {
    // create actor system used by projector and grpc client
    final var system = ActorSystem.create("daml-finance-projection");
    final var dataSource = new HikariDataSource(dbConfig);
    final var connection = dataSource.getConnection();
    // create projector
    final Projector<JdbcAction> projector = JdbcProjector.create(dataSource, system);

    final var baseGrpcClientSettings = GrpcClientSettings
      .connectToServiceAt(ledgerHost, ledgerPort, system)
      .withTls(!ledgerPlaintext);
    final var grpcClientSettings = tokenCallCredentials
      .map(baseGrpcClientSettings::withCallCredentials)
      .orElse(baseGrpcClientSettings);
    var failedToStart = false;

    final List<Control> controls = new ArrayList<>();
    final AtomicBoolean shouldRetry = new AtomicBoolean(true);
    logger.info("Initialising controls");
    final var generators = List.of(
      // Accounts
      new AccountFactoryEventsProjectionGenerator(readAs),
      new AccountsProjectionGenerator(readAs, connection),

      // Holdings
      new HoldingsProjectionGenerator(readAs, connection),

      // Batches
      new BatchesProjectionGenerator(readAs, connection),
      new WitnessProjectionGenerator(readAs, "batch", Batch.INTERFACE, "batch_witnesses"),

      // Instructions
      new InstructionsProjectionGenerator(readAs, connection),
      new WitnessProjectionGenerator(
        readAs, "instructions", Instruction.INTERFACE, "instruction_witnesses"
      ),
      new InstructionExecutionsProjectionGenerator(readAs),

      // Instruments
      new TokenProjectionGenerator(readAs),
      new PbaProjectionGenerator(readAs),
      new WitnessProjectionGenerator(
        readAs,
        "token_instruments",
        daml.finance.interface$.instrument.token.instrument.Instrument.INTERFACE,
        "instrument_witnesses"
      ),
      new WitnessProjectionGenerator(
        readAs,
        "pba_instruments",
        synfini.interface$.instrument.partyboundattributes.instrument.Instrument.INTERFACE,
        "instrument_witnesses"
      )
    );

    for (final var generator : generators) {
      try {
        final var control = generator.control(grpcClientSettings, projector);
        control.failed().whenComplete((throwable, ignored) -> {
          logger.error("Failed to run Projection", throwable);
          updateRetryFlag(shouldRetry, throwable);
          control.resourcesClosed().thenRun(system::terminate);
        });
        controls.add(control);
      } catch (Throwable t) {
        updateRetryFlag(shouldRetry, t);
        failedToStart = true;
        logger.error("Failed to create control", t);
        break;
      }
    }

    if (failedToStart) {
      for (var c : controls) {
        c.cancel();
      }
    } else {
      logger.info("Started controls");
    }

    var exitCode = 1;

    try {
      system.getWhenTerminated().toCompletableFuture().get();
    } catch (Exception e) {
      logger.error("Projection terminated with exception", e);
      if (e instanceof InterruptedException || e instanceof CancellationException) {
        shouldRetry.set(false);
        exitCode = 0;
      } else {
        updateRetryFlag(shouldRetry, e);
      }
      for (var c : controls) {
        c.cancel().toCompletableFuture().get();
      }
    }

    connection.close();
    dataSource.close();

    return new ProjectionResult(shouldRetry.get(), exitCode);
  }

  private static void updateRetryFlag(AtomicBoolean shouldRetry, Throwable t) {
    final var grpcStatus = Status.fromThrowable(t);
    if (
      grpcStatus.getCode().equals(Status.Code.INVALID_ARGUMENT) ||
      grpcStatus.getCode().equals(Status.Code.NOT_FOUND) ||
      grpcStatus.getCode().equals(Status.Code.OUT_OF_RANGE) ||
      grpcStatus.getCode().equals(Status.Code.PERMISSION_DENIED) ||
      grpcStatus.getCode().equals(Status.Code.UNAUTHENTICATED) ||
      grpcStatus.getCode().equals(Status.Code.UNIMPLEMENTED)
    ) {
      shouldRetry.set(false);
    }
  }

  private static class ProjectionResult {
    public final boolean shouldRetry;
    public final int exitCode;

    private ProjectionResult(boolean shouldRetry, int exitCode) {
      this.shouldRetry = shouldRetry;
      this.exitCode = exitCode;
    }
  }
}
