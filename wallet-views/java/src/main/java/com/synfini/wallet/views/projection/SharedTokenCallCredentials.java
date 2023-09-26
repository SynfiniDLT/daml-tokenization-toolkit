package com.synfini.wallet.views.projection;

import static io.grpc.Metadata.ASCII_STRING_MARSHALLER;

import com.google.gson.Gson;
import io.grpc.CallCredentials;
import io.grpc.Metadata;
import io.grpc.Status;
import kong.unirest.Unirest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;

public class SharedTokenCallCredentials extends CallCredentials {
  private static final Logger logger = LoggerFactory.getLogger(SharedTokenCallCredentials.class);

  private static final Metadata.Key<String> AUTHORIZATION_METADATA_KEY =
    Metadata.Key.of("Authorization", ASCII_STRING_MARSHALLER);

  private final String url;
  private final String clientId;
  private final String clientSecret;
  private final String audience;
  private final Long refreshWindowSeconds;
  private final ReentrantLock tokenLock;
  private final AtomicReference<Optional<TokenDetail>> token;

  public SharedTokenCallCredentials(
    String url,
    String clientId,
    String clientSecret,
    String audience,
    Long refreshWindowSeconds
  ) {
    this.url = url;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.audience = audience;
    this.refreshWindowSeconds = refreshWindowSeconds;
    this.tokenLock = new ReentrantLock();
    this.token = new AtomicReference<>(Optional.empty());
  }

  @Override
  public void applyRequestMetadata(RequestInfo requestInfo, Executor executor, MetadataApplier metadataApplier) {
    executor.execute(() -> {
      final var nowSeconds = System.currentTimeMillis() / 1000L;
      Optional<TokenDetail> t = Optional.empty();
      tokenLock.lock();
      try {
        t = token.updateAndGet(currentToken -> {
          if (currentToken
            .map(c -> (c.expiryTimestampSeconds - nowSeconds) <= refreshWindowSeconds)
            .orElse(true)) {
            final FetchTokenResponse fetchTokenResp;
            try {
              fetchTokenResp = fetchToken();
            } catch (Exception e) {
              logger.error("Error fetching token", e);
              return Optional.empty();
            }
            return Optional.of(
              new TokenDetail(
                fetchTokenResp.access_token,
                nowSeconds + fetchTokenResp.expires_in
              )
            );
          } else {
            return currentToken;
          }
        });
      } finally {
        tokenLock.unlock();
      }

      if (t.isEmpty()) {
        metadataApplier.fail(Status.INTERNAL);
      } else {
        final Metadata headers = new Metadata();
        headers.put(AUTHORIZATION_METADATA_KEY, "Bearer " + t.get().token);
        metadataApplier.apply(headers);
      }
    });
  }

  @Override
  public void thisUsesUnstableApi() {

  }

  private FetchTokenResponse fetchToken() throws Exception {
    final var response = Unirest
      .post(url)
      .header("content-type", "application/x-www-form-urlencoded")
      .body(
        "grant_type=client_credentials" +
          "&client_id=" + clientId +
          "&client_secret=" + clientSecret +
          "&audience=" + URLEncoder.encode(audience, StandardCharsets.UTF_8)
      ).asString();
    if (response.getStatus() != 200) {
      throw new Exception("Non-200 error from token endpoint: " + response.getStatus() + " " + response.getStatusText());
    } else {
      final var resp = new Gson().fromJson(response.getBody(), FetchTokenResponse.class);
      if (resp.access_token == null || resp.expires_in == null) {
        throw new Exception("Fetch token response missing required fields: "  + response.getBody());
      } else {
        return resp;
      }
    }
  }

  private static class TokenDetail {
    public final String token;
    public final Long expiryTimestampSeconds;

    private TokenDetail(String token, Long expiryTimestampSeconds) {
      this.token = token;
      this.expiryTimestampSeconds = expiryTimestampSeconds;
    }
  }

  private static class FetchTokenResponse {
    public String access_token;
    public Long expires_in;
  }
}
