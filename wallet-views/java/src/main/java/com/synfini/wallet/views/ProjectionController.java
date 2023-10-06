package com.synfini.wallet.views;

import com.synfini.wallet.views.config.LedgerApiConfig;
import com.synfini.wallet.views.config.ProjectionConfig;
import com.synfini.wallet.views.config.SpringDbConfig;
import com.synfini.wallet.views.config.WalletViewsApiConfig;
import com.synfini.wallet.views.projection.ProjectionRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.concurrent.*;

// TODO need to authentication to these endpoints. Could do this using `WalletAuth` utilities
@RestController
@RequestMapping("v1")
public class ProjectionController {
  private static final Logger logger = LoggerFactory.getLogger(ProjectionController.class);

  @Autowired
  WalletViewsApiConfig walletViewsApiConfig;
  @Autowired
  LedgerApiConfig ledgerApiConfig;
  @Autowired
  ProjectionConfig projectionConfig;
  @Autowired
  SpringDbConfig springDbConfig;
  private Future<Integer> projectionResult;
  private ExecutorService projectionExecutorService;

  @PostMapping("/projection/clear")
  public ResponseEntity<String> clear() throws InterruptedException, ExecutionException {
    projectionExecutorService.shutdownNow();
    if (!projectionExecutorService.awaitTermination(8, TimeUnit.SECONDS)) {
      logger.warn("Timed out waiting for projection runner to stop");
    }
    if (projectionResult.get() != 0) {
      logger.error("Non-zero projection result: " + projectionResult.get());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Projection exited with non-zero exit code");
    }
    return null;
  }

  @PostMapping("/projection/start")
  public ResponseEntity<String> start(@RequestBody ProjectionStartBody body) throws Exception {
    final ProjectionRunner projectionRunner;
    if (body.tokenUrl.isEmpty()) {
      projectionRunner = new ProjectionRunner(
        springDbConfig,
        ledgerApiConfig,
        projectionConfig,
        body.readAs
      );
    } else {
      projectionRunner = new ProjectionRunner(
        springDbConfig,
        ledgerApiConfig,
        projectionConfig,
        body.readAs,
        body.tokenUrl.get(),
        body.clientId.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "clientId not provided")),
        body.clientSecret.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "clientSecret not provided")),
        body.audience.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "audience not provided"))
      );
    }
    projectionExecutorService = Executors.newSingleThreadExecutor();
    projectionResult = projectionExecutorService.submit(projectionRunner);
    return null;
  }

  public static class ProjectionStartBody {
    public String readAs;
    public Optional<String> tokenUrl;
    public Optional<String> clientId;
    public Optional<String> clientSecret;
    public Optional<String> audience;
  }
}
