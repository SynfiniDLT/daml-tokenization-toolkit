package com.synfini.wallet.views;

import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.Identifier;
import com.daml.ledger.javaapi.data.codegen.ValueDecoder;
import com.google.gson.Gson;

import da.set.types.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

public class Util {
  public static final Gson gson = new Gson();

  private static final Logger logger = LoggerFactory.getLogger(Util.class);

  public static java.sql.Array setToArray(Optional<Set<String>> set, Connection conn) {
    try {
      return conn.createArrayOf(
        "varchar",
          set
            .map(s -> s.map.keySet())
            .orElse(Collections.emptySet())
            .stream()
            .sorted()
            .toArray()
      );
    } catch (SQLException e) {
      throw new RuntimeException(e);
    }
  }

  public static <V> Optional<V> getView(CreatedEvent createdEvent, Identifier interfaceId, ValueDecoder<V> valueDecoder) {
    final var viewRecord = createdEvent.getInterfaceViews().get(interfaceId);
    if (viewRecord == null) {
      logger.warn(
        "Interface view for template ID " + interfaceId  + " unavailable on contract ID " + createdEvent.getContractId()
      );
      return Optional.empty();
    } else {
      return Optional.of(valueDecoder.decode(viewRecord));
    }
  }
}
