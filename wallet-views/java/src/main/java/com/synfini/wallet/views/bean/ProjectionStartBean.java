package com.synfini.wallet.views.bean;

import com.synfini.wallet.views.projection.ProjectionRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import picocli.CommandLine;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

@Component
public class ProjectionStartBean implements InitializingBean {
    private static final Logger logger = LoggerFactory.getLogger(ProjectionStartBean.class);
    private static final List<ExecutorService> projectionExecutorServices = new ArrayList<>();
    private static final List<Future<Integer>> projectionDaemonFutures = new ArrayList<>();
    private static Path dbPasswordFile;
    @Value("${walletviews.projection.start}")
    boolean projectionStart;
    @Value("${walletviews.ledger-host}")
    String ledgerHost;
    @Value("${walletviews.ledger-port}")
    String ledgerPort;
    @Value("${walletviews.ledger-plaintext}")
    String ledgerplaintext;
    @Value("${walletviews.ledger-readas}")
    String ledgerReadAs;
    @Value("${spring.datasource.url}")
    String springDataSourceUrl;
    @Value("${spring.datasource.username}")
    String springDataSourceUsername;
    @Value("${spring.datasource.password}")
    String springDataSourcePassword;

    @Override
    public void afterPropertiesSet() throws Exception {
        if (projectionStart) {
            dbPasswordFile = Files.createTempFile("wallet-views-test-db-password", null);
            Files.write(dbPasswordFile, springDataSourcePassword.getBytes(StandardCharsets.UTF_8));

            ExecutorService projectionExecutorService = Executors.newSingleThreadExecutor();
            Future<Integer> projectionDaemonFuture = projectionExecutorService.submit(new Callable<Integer>() {
                @Override
                public Integer call() {
                    return new CommandLine(new ProjectionRunner()).execute(
                            "--ledger-host", ledgerHost,
                            "--ledger-port", ledgerPort,
                            "--ledger-plaintext",
                            "--db-url", springDataSourceUrl,
                            "--db-user", springDataSourceUsername,
                            "--db-password-file", dbPasswordFile.toString(),
                            "--read-as", ledgerReadAs
                    );
                }
            });
            projectionExecutorServices.add(projectionExecutorService);
            projectionDaemonFutures.add(projectionDaemonFuture);
            logger.info("Daemon projection is running");
        }
    }

    public void stopProjection() {
        // cancel all Future calls in the projection Daemon
        projectionDaemonFutures.forEach(daemon -> {
            try {
                daemon.cancel(true);
                logger.info("Daemon " + daemon.get().longValue() + "is cancelled=" + daemon.isCancelled());
            } catch (ExecutionException | InterruptedException e) {
                throw new RuntimeException(e);
            }
        });

        projectionDaemonFutures.clear();
        projectionExecutorServices.clear();
        this.projectionStart = false;
    }

    public void startProjection() throws Exception {
        this.projectionStart = true;
        this.afterPropertiesSet();

    }
}
