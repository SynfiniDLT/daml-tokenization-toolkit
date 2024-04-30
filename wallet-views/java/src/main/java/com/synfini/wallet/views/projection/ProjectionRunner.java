package com.synfini.wallet.views.projection;

import akka.actor.ActorSystem;
import akka.grpc.GrpcClientSettings;
import com.daml.projection.JdbcAction;
import com.daml.projection.JdbcProjector;
import com.daml.projection.javadsl.Control;
import com.daml.projection.javadsl.Projector;
import com.synfini.wallet.views.config.LedgerApiConfig;
import com.synfini.wallet.views.config.ProjectionConfig;
import com.synfini.wallet.views.config.SpringDbConfig;
import com.synfini.wallet.views.projection.generators.account.AccountFactoryEventsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.account.AccountOpenOffersProjectionGenerator;
import com.synfini.wallet.views.projection.generators.account.AccountsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.batch.BatchesProjectionGenerator;
import com.synfini.wallet.views.projection.generators.holding.HoldingsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.instruction.InstructionExecutionsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.instruction.InstructionsProjectionGenerator;
import com.synfini.wallet.views.projection.generators.instrument.TokenProjectionGenerator;
import com.synfini.wallet.views.projection.generators.issuer.TokenIssuerProjectionGenerator;
import com.synfini.wallet.views.projection.generators.witness.WitnessProjectionGenerator;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import daml.finance.interface$.settlement.batch.Batch;
import daml.finance.interface$.settlement.instruction.Instruction;
import io.grpc.Status;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import synfini.interface$.onboarding.account.openoffer.openoffer.OpenOffer;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CancellationException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

public class ProjectionRunner implements Callable<Integer> {
  private static final Logger logger = LoggerFactory.getLogger(ProjectionRunner.class);
  private final SpringDbConfig springDbConfig;
  private final LedgerApiConfig ledgerApiConfig;
  private final ProjectionConfig projectionConfig;
  private final String readAs;
  private final Optional<String> tokenUrl;
  private final Optional<String> clientId;
  private final Optional<String> clientSecret;
  private final Optional<String> audience;

  public ProjectionRunner(
    SpringDbConfig springDbConfig,
    LedgerApiConfig ledgerApiConfig,
    ProjectionConfig projectionConfig,
    String readAs
  ) {
    this.springDbConfig = springDbConfig;
    this.ledgerApiConfig = ledgerApiConfig;
    this.projectionConfig = projectionConfig;
    this.readAs = readAs;
    this.tokenUrl = Optional.empty();
    this.clientSecret = Optional.empty();
    this.clientId = Optional.empty();
    this.audience = Optional.empty();
  }

  public ProjectionRunner(
    SpringDbConfig springDbConfig,
    LedgerApiConfig ledgerApiConfig,
    ProjectionConfig projectionConfig,
    String readAs,
    String tokenUrl,
    String clientId,
    String clientSecret,
    String audience
  ) {
    this.springDbConfig = springDbConfig;
    this.ledgerApiConfig = ledgerApiConfig;
    this.projectionConfig = projectionConfig;
    this.readAs = readAs;
    this.tokenUrl = Optional.of(tokenUrl);
    this.clientId = Optional.of(clientId);
    this.clientSecret = Optional.of(clientSecret);
    this.audience = Optional.of(audience);
  }

  @Override
  public Integer call() throws Exception {
    // setup datasource and projection table
    final var dbConfig = new HikariConfig();
    dbConfig.setJdbcUrl(springDbConfig.url);
    dbConfig.setUsername(springDbConfig.user);
    dbConfig.setPassword(springDbConfig.password);
    dbConfig.setMaximumPoolSize(26); // TODO this should be set based on the number projections (e.g. 2 * numProjections)

    final Optional<SharedTokenCallCredentials> tokenCreds;
    if (tokenUrl.isPresent()) {
      tokenCreds = Optional.of(
        new SharedTokenCallCredentials(
          tokenUrl.get(),
          clientId.get(),
          clientSecret.get(),
          audience.get(),
          projectionConfig.tokenRefreshWindowSeconds
        )
      );
    } else {
      tokenCreds = Optional.empty();
    }

    int numRetries = 0;
    while (true) {
      final var startSeconds = System.currentTimeMillis() / 1000L;
      final var result = runProjections(dbConfig, tokenCreds);
      final var endSeconds = System.currentTimeMillis() / 1000L;
      if (endSeconds - startSeconds > projectionConfig.retryWindowSeconds) {
        numRetries = 0;
      }
      if (!result.shouldRetry || numRetries >= projectionConfig.maxRetries) {
        return result.exitCode;
      } else {
        Thread.sleep(projectionConfig.retryDelaySeconds * 1000L);
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
      .connectToServiceAt(ledgerApiConfig.ledgerHost, ledgerApiConfig.ledgerPort, system)
      .withTls(!ledgerApiConfig.ledgerPlaintext);
    final var grpcClientSettings = tokenCallCredentials
      .map(baseGrpcClientSettings::withCallCredentials)
      .orElse(baseGrpcClientSettings);
    var failedToStart = false;

    final List<Control> controls = new ArrayList<>();
    final AtomicBoolean shouldRetry = new AtomicBoolean(true);
    logger.info("Initialising controls");
    final var generators = List.of(
      // Accounts
      new AccountOpenOffersProjectionGenerator(readAs, connection),
      new WitnessProjectionGenerator(readAs, "account_open_offers", OpenOffer.INTERFACE, "account_open_offer_witnesses"),
      new AccountFactoryEventsProjectionGenerator(readAs),
      new AccountsProjectionGenerator(readAs, connection),

      // Holdings
      new HoldingsProjectionGenerator(readAs, connection),
      new WitnessProjectionGenerator(
        readAs, "holdings", daml.finance.interface$.holding.base.Base.INTERFACE, "holding_witnesses"
      ),

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
      new WitnessProjectionGenerator(
        readAs,
        "token_instruments",
        daml.finance.interface$.instrument.token.instrument.Instrument.INTERFACE,
        "instrument_witnesses"
      ),

      // Issuers
      new TokenIssuerProjectionGenerator(readAs),
      new WitnessProjectionGenerator(
        readAs,
        "token_issuer",
        synfini.interface$.onboarding.issuer.instrument.token.issuer.Issuer.INTERFACE,
        "token_instrument_issuer_witnesses"
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
