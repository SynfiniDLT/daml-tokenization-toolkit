package com.synfini.wallet.views.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

@Configuration
public class ProjectionConfig {
  @Value("${walletviews.projection.token-refresh-window-seconds}")
  public long tokenRefreshWindowSeconds;

  @Value("${walletviews.projection.max-retries}")
  public int maxRetries;

  @Value("${walletviews.projection.retry-window-seconds}")
  public int retryWindowSeconds;

  @Value("${walletviews.projection.retry-delay-seconds}")
  public int retryDelaySeconds;
}
