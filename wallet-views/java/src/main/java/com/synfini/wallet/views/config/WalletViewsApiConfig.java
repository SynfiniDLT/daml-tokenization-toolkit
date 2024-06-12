// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

package com.synfini.wallet.views.config;

import com.fatboyindustrial.gsonjavatime.Converters;
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
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Configuration
public class WalletViewsApiConfig implements WebMvcConfigurer {
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
    builder.registerTypeAdapter(BigDecimal.class, new BigDecimalTypeAdapter());
    Converters.registerInstant(builder);
    builder.serializeNulls();
    return builder;
  }

  private static class BigDecimalTypeAdapter extends TypeAdapter<BigDecimal> {
    @Override
    public void write(JsonWriter out, BigDecimal value) throws IOException {
      var valueString = value.toPlainString();
      // Unfortunately the test cases do not pass without the following additional logic due to differences between
      // the encoding used by the Daml JSON library and how the `toPlainString` method works
      if (BigDecimal.ZERO.equals(value)) {
        out.value("0.0");
      } else if (valueString.contains(".")) {
        while (valueString.endsWith("0") && !valueString.endsWith(".0")) {
          valueString = valueString.substring(0, valueString.length() - 1);
        }
        out.value(valueString);
      } else {
        out.value(valueString);
      }
    }

    @Override
    public BigDecimal read(JsonReader in) throws IOException {
      return new Gson().fromJson(in, BigDecimal.class); // Use standard reading method
    }
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
    public void write(JsonWriter out, Optional<E> value) throws IOException {
      if (value.isPresent()){
        adapter.write(out, value.get());
      } else {
        out.nullValue();
      }
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
