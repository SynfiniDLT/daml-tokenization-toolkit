package com.synfini.wallet.views.config;

import com.google.gson.Gson;
import com.google.gson.*;
import com.google.gson.reflect.TypeToken;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.gson.GsonBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Optional;

@Configuration
public class WalletViewsConfig implements WebMvcConfigurer {
  @Value("${walletviews.max-transactions-response-size}")
  public Long maxTransactionsResponseSize;

  @Bean
  // Custom Gson builder which provides support for reading `Optional`
  // This is a work-around until such time as DA adds support for de-serializing Daml-compliant JSON using their library
  // Once this issue is fixed then we won't need Gson anymore
  // Please refer to https://discuss.daml.com/t/java-jsoncodec-how-to-convert-from-jsvalue-to-value/6453
  public GsonBuilder gsonBuilder(List<GsonBuilderCustomizer> customizers) {
    GsonBuilder builder = new GsonBuilder();
    // Enable the spring.gson.* configuration in the configuration file
    customizers.forEach((c) -> c.customize(builder));
    builder.registerTypeAdapterFactory(GsonOptionalTypeAdapter.FACTORY);
    return builder;
  }

  private static class GsonOptionalTypeAdapter<E> extends TypeAdapter<Optional<E>> {
    static final TypeAdapterFactory FACTORY =
      new TypeAdapterFactory() {
        @Override
        public <T> TypeAdapter<T> create(Gson gson, TypeToken<T> type) {
          Class<T> rawType = (Class<T>) type.getRawType();
          if (rawType != Optional.class) {
            return null;
          }
          final ParameterizedType parameterizedType = (ParameterizedType) type.getType();
          final Type actualType = parameterizedType.getActualTypeArguments()[0];
          final TypeAdapter<?> adapter = gson.getAdapter(TypeToken.get(actualType));
          return new GsonOptionalTypeAdapter(adapter);
        }
      };

    private final TypeAdapter<E> adapter;

    GsonOptionalTypeAdapter(TypeAdapter<E> adapter) {
      this.adapter = adapter;
    }

    @Override
    public void write(JsonWriter out, Optional<E> value) {
      throw new UnsupportedOperationException(
        "Cannot write Optional types as JSON using gson: use com.daml.lf.codegen.json.JsonCodec instead"
      );
    }

    @Override
    public Optional<E> read(JsonReader in) throws IOException {
      final JsonToken peek = in.peek();
      if (peek != JsonToken.NULL) {
        return Optional.ofNullable(adapter.read(in));
      }

      in.nextNull();
      return Optional.empty();
    }
  }
}
