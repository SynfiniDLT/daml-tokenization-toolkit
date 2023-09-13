package com.synfini.wallet.views;

import da.set.types.Set;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

public class Util {
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
}
