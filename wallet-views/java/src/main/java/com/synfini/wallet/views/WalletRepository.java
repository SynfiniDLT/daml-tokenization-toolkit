package com.synfini.wallet.views;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import com.daml.ledger.javaapi.data.ExercisedEvent;
import com.daml.ledger.javaapi.data.Identifier;
import com.daml.ledger.javaapi.data.Unit;
import com.daml.ledger.rxjava.LedgerClient;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.synfini.wallet.views.schema.response.HoldingSummary;
import com.synfini.wallet.views.schema.response.InstrumentSummary;
import com.synfini.wallet.views.schema.response.IssuerSummary;
import com.synfini.wallet.views.schema.response.TokenIssuerSummary;

import daml.finance.interface$.account.account.Account;
import daml.finance.interface$.holding.base.Lock;
import daml.finance.interface$.holding.base.LockType;
import daml.finance.interface$.types.common.types.AccountKey;
import daml.finance.interface$.types.common.types.Id;
import daml.finance.interface$.types.common.types.InstrumentKey;
import io.reactivex.Flowable;
import io.reactivex.Single;
import synfini.wallet.api.types.AccountOpenOfferSummary;
import synfini.wallet.api.types.AccountSummary;
// import synfini.wallet.api.types.*;
import synfini.wallet.api.types.Balance;
import synfini.wallet.api.types.SettlementStep;
import synfini.wallet.api.types.SettlementSummary;
import synfini.wallet.api.types.SettlementsRaw;
import synfini.wallet.api.types.TransactionDetail;

@Component
public class WalletRepository {
  private final JdbcTemplate jdbcTemplate;
  private final DataSource pgDataSource;

  @Autowired
  public WalletRepository(JdbcTemplate jdbcTemplate, DataSource pgDataSource) {
    this.jdbcTemplate = jdbcTemplate;
    this.pgDataSource = pgDataSource;
  }

  public List<AccountSummary<String, JsonObject>> accounts(Optional<String> custodian, String owner) {
    return jdbcTemplate.query(
      multiLineQuery(
        "SELECT * FROM active(?)",
        "WHERE (? IS NULL OR payload->>'custodian' = ?) AND payload->>'owner' = ?"
      ),
      ps -> {
        int pos = 0;
        ps.setString(++pos, fullyQualified(Account.TEMPLATE_ID));
        ps.setString(++pos, custodian.orElse(null));
        ps.setString(++pos, custodian.orElse(null));
        ps.setString(++pos, owner);
      },
      new AccountRowMapper()
    );
  }

  public List<AccountOpenOfferSummary<String, JsonObject>> accountOpenOffers(List<String> readAs) {
    return jdbcTemplate.query(
      multiLineQuery(
        "SELECT",
        "  offer.contract_id AS contract_id,",
        "  offer.created_at_offset AS created_at_offset,",
        "  offer.created_effective_at AS created_effective_at,",
        "  offer.payload AS payload",
        "FROM active(?) AS offer",
        "INNER JOIN active(?) AS disclosure ON offer.contract_id = disclosure.contract_id",
        "WHERE",
        "  offer.payload->>'custodian' = ANY(?) OR",
        "  (flatten_observers(disclosure.payload->'observers') && ?) OR",
        "  (",
        "    offer.payload->'permittedOwners' IS NOT NULL AND",
        "    (daml_set_text_values(offer.payload->'permittedOwners') && ?)",
        "  )"
      ),
      ps -> {
        int pos = 0;
        ps.setString(
          ++pos,
          fullyQualified(synfini.interface$.onboarding.account.openoffer.openoffer.OpenOffer.TEMPLATE_ID)
        );
        ps.setString(
          ++pos,
          fullyQualified(daml.finance.interface$.util.disclosure.Disclosure.TEMPLATE_ID)
        );
        final var readAsArray = asSqlArray(readAs);
        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
      },
      new AccountOpenOfferRowMapper()
    );
  }

  public List<Balance> balanceByAccount(AccountKey account) {
    return jdbcTemplate.query(
      multiLineQuery(
        "SELECT",
        "  holding.payload->'instrument'->>'depository' AS instrument_depository,",
        "  holding.payload->'instrument'->>'issuer' AS instrument_issuer,",
        "  holding.payload->'instrument'->'id'->>'unpack' AS instrument_id,",
        "  holding.payload->'instrument'->>'version' AS instrument_version,",
        "  sum(CASE WHEN jsonb_typeof(holding.payload->'lock') = 'null' THEN (holding.payload->>'amount') :: DECIMAL ELSE 0 END) unlocked_balance,",
        "  sum(CASE WHEN jsonb_typeof(holding.payload->'lock') <> 'null' THEN (holding.payload->>'amount') :: DECIMAL ELSE 0 END) locked_balance",
        "FROM active(?) AS holding",
        "WHERE",
        "  holding.payload->'account'->>'custodian' = ? AND",
        "  holding.payload->'account'->>'owner' = ? AND",
        "  holding.payload->'account'->'id'->>'unpack' = ?",
        "GROUP BY",
        "  holding.payload->'instrument'->>'depository',",
        "  holding.payload->'instrument'->>'issuer',",
        "  holding.payload->'instrument'->'id'->>'unpack',",
        "  holding.payload->'instrument'->>'version'"
      ),
      ps -> {
        int pos = 0;
        ps.setString(
          ++pos,
          fullyQualified(daml.finance.interface$.holding.base.Base.TEMPLATE_ID)
        );
        ps.setString(++pos, account.custodian);
        ps.setString(++pos, account.owner);
        ps.setString(++pos, account.id.unpack);
      },
      new BalanceRowMapperWithAccount(account)
    );
  }

  public List<HoldingSummary> holdings(AccountKey account, InstrumentKey instrument, List<String> readAs) {
    return jdbcTemplate.query(
      multiLineQuery(
        "SELECT",
        "  holding.contract_id AS contract_id,",
        "  holding.payload AS payload,",
        "  holding.created_at_offset AS created_at_offset,",
        "  holding.created_effective_at AS created_effective_at",
        "FROM active(?) AS holding",
        "INNER JOIN active(?) AS disclosure ON holding.contract_id = disclosure.contract_id",
        "WHERE",
        "  holding.payload->'account'->>'custodian' = ? AND",
        "  holding.payload->'account'->>'owner' = ? AND",
        "  holding.payload->'account'->'id'->>'unpack' = ? AND",
        "  holding.payload->'instrument'->>'depository' = ? AND",
        "  holding.payload->'instrument'->>'issuer' = ? AND",
        "  holding.payload->'instrument'->'id'->>'unpack' = ? AND",
        "  holding.payload->'instrument'->>'version' = ? AND",
        "  (",
        "    holding.payload->'account'->>'custodian' = ANY(?) OR",
        "    holding.payload->'account'->>'owner' = ANY(?) OR",
        "    flatten_observers(disclosure.payload->'observers') && ? OR",
        "    daml_set_text_values(holding.payload->'lock'->'lockers') && ?",
        "  )"
      ),
      ps -> {
        int pos = 0;
        ps.setString(
          ++pos,
          fullyQualified(daml.finance.interface$.holding.base.Base.TEMPLATE_ID)
        );
        ps.setString(
          ++pos,
          fullyQualified(daml.finance.interface$.util.disclosure.Disclosure.TEMPLATE_ID)
        );

        ps.setString(++pos, account.custodian);
        ps.setString(++pos, account.owner);
        ps.setString(++pos, account.id.unpack);
  
        ps.setString(++pos, instrument.depository);
        ps.setString(++pos, instrument.issuer);
        ps.setString(++pos, instrument.id.unpack);
        ps.setString(++pos, instrument.version);

        final var readAsArray = asSqlArray(readAs);
        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);

      },
      new HoldingsRowMapper()
    );
  }

  public List<InstrumentSummary> instruments(
    Optional<String> depository,
    String issuer,
    Optional<Id> id,
    Optional<String> version,
    List<String> readAs
  ) {
    return jdbcTemplate.query(
      multiLineQuery(
        "SELECT",
        "  base_instrument.contract_id AS contract_id,",
        "  token_instrument.payload AS token_instrument_payload",
        "FROM active(?) AS base_instrument",
        "INNER JOIN active(?) AS token_instrument ON base_instrument.contract_id = token_instrument.contract_id",
        "INNER JOIN active(?) AS disclosure ON token_instrument.contract_id = disclosure.contract_id",
        "WHERE",
        "  (? IS NULL OR base_instrument.payload->>'depository' = ?) AND",
        "  base_instrument.payload->>'issuer' = ? AND",
        "  (? IS NULL OR base_instrument.payload->'id'->>'unpack' = ?) AND",
        "  (? IS NULL OR base_instrument.payload->>'version' = ?) AND",
        "  (",
        "    base_instrument.payload->>'depository' = ANY(?) OR",
        "    base_instrument.payload->>'issuer' = ANY(?) OR",
        "    flatten_observers(disclosure.payload->'observers') && ?",
        "  )"
      ),
      ps -> {
        int pos = 0;
        ps.setString(++pos, fullyQualified(daml.finance.interface$.instrument.base.instrument.Instrument.TEMPLATE_ID));
        ps.setString(++pos, fullyQualified(daml.finance.interface$.instrument.token.instrument.Instrument.TEMPLATE_ID));
        ps.setString(++pos, fullyQualified(daml.finance.interface$.util.disclosure.Disclosure.TEMPLATE_ID));

        final var depository_ = depository.orElse(null);
        ps.setString(++pos, depository_);
        ps.setString(++pos, depository_);

        ps.setString(++pos, issuer);

        final var id_ = id.map(i -> i.unpack).orElse(null);
        ps.setString(++pos, id_);
        ps.setString(++pos, id_);

        final var version_ = version.orElse(null);
        ps.setString(++pos, version_);
        ps.setString(++pos, version_);

        final var readAsArray = asSqlArray(readAs);

        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
      },
      new TokenInstrumentRowMapper()
    );
  }

  public List<IssuerSummary> issuers(Optional<String> depository, Optional<String> issuer, List<String> readAs) {
    return jdbcTemplate.query(
      multiLineQuery(
        "SELECT",
        "  token_issuer.contract_id AS contract_id,",
        "  token_issuer.payload AS token_issuer_payload",
        "FROM active(?) AS token_issuer",
        "INNER JOIN active(?) AS disclosure ON token_issuer.contract_id = disclosure.contract_id",
        "WHERE",
        "  (? IS NULL OR token_issuer.payload->>'depository' = ?) AND",
        "  (? IS NULL OR token_issuer.payload->>'issuer' = ?) AND",
        "  (",
        "    token_issuer.payload->>'depository' = ANY(?) OR",
        "    token_issuer.payload->>'issuer' = ANY(?) OR",
        "    flatten_observers(disclosure.payload->'observers') && ?",
        "  )"
      ),
      ps -> {
        int pos = 0;

        ps.setString(
          ++pos,
          fullyQualified(synfini.interface$.onboarding.issuer.instrument.token.issuer.Issuer.TEMPLATE_ID)
        );
        ps.setString(++pos, fullyQualified(daml.finance.interface$.util.disclosure.Disclosure.TEMPLATE_ID));

        final var depository_ = depository.orElse(null);
        ps.setString(++pos, depository_);
        ps.setString(++pos, depository_);

        final var issuer_ = issuer.orElse(null);
        ps.setString(++pos, issuer_);
        ps.setString(++pos, issuer_);

        final var readAsArray = asSqlArray(readAs);

        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
      },
      new IssuersRowMapper()
    );
  }

  public List<
    SettlementSummary<JsonObject, JsonObject, String, JsonObject, String, JsonObject, JsonObject>
  > settlements(
    LedgerClient ledgerClient,
    List<String> readAs,
    Optional<String> before,
    long limit
  ) throws SQLException {
    final var readAsArray = asSqlArray(readAs);
    final var instructionsMinOffsets = multiLineQuery(
      "  SELECT",
      "    instruction.payload->'batchId'->>'unpack' AS batch_id,",
      "    daml_set_text_values(instruction.payload->'requestors') AS requestors,",
      "    min(instruction.created_at_offset) AS min_create_offset,",
      "    min(instruction.created_effective_at) AS min_create_effective_time",
      "  FROM creates(?) AS instruction",
      "  INNER JOIN creates(?) AS disclosure ON instruction.contract_id = disclosure.contract_id",
      "  WHERE",
      "    daml_set_text_values(instruction.payload->'requestors') && ? OR",
      "    daml_set_text_values(instruction.payload->'settlers') && ? OR",
      "    daml_set_text_values(instruction.payload->'signedSenders') && ? OR",
      "    daml_set_text_values(instruction.payload->'signedReceivers') && ? OR",
      "    instruction.payload->'routedStep'->>'sender' = ANY(?) OR",
      "    instruction.payload->'routedStep'->>'receiver' = ANY(?) OR",
      "    flatten_observers(disclosure.payload->'observers') && ?",
      "  GROUP BY (instruction.payload->'batchId'->>'unpack', daml_set_text_values(instruction.payload->'requestors'))",
      "  HAVING ? IS NULL OR min(instruction.created_at_offset) < ?",
      "  ORDER BY min_create_offset DESC",
      "  LIMIT ?"
    );
    final java.util.function.BiFunction<Integer, PreparedStatement, Integer> instructionMinOffsetsSetter = (pos, ps) -> {
      try {
        ps.setString(++pos, fullyQualified(daml.finance.interface$.settlement.instruction.Instruction.TEMPLATE_ID));
        ps.setString(++pos, fullyQualified(daml.finance.interface$.util.disclosure.Disclosure.TEMPLATE_ID));

        final var readAsEnd = pos + 7;
        while (pos < readAsEnd) {
          ps.setArray(++pos, readAsArray);
        }

        final var b = before.orElse(null);
        ps.setString(++pos, b);
        ps.setString(++pos, b);
        ps.setLong(++pos, limit);
        return pos;
      } catch (SQLException e) {
        throw new RuntimeException(e); // TODO remove?
      }
    };

    final var selectBatches = multiLineQuery(
      "  SELECT",
      "    contract_id,",
      "    payload",
      "  FROM creates(?) AS batch",
      "  WHERE",
      "    daml_set_text_values(batch.payload->'requestors') && ? OR",
      "    daml_set_text_values(batch.payload->'settlers') && ?"
    );
    final java.util.function.BiFunction<Integer, PreparedStatement, Integer> batchesSetter = (pos, ps) -> {
      try {
        ps.setString(++pos, fullyQualified(daml.finance.interface$.settlement.batch.Batch.TEMPLATE_ID));
        ps.setArray(++pos, readAsArray);
        ps.setArray(++pos, readAsArray);
        return pos;
      } catch (SQLException e) {
        throw new RuntimeException(e);
      }
    };

    final var selectSettlements = multiLineQuery(
      "SELECT DISTINCT ON (witness_at_offset, batch_id, requestors, instruction_id)",
      "  instructions.contract_id AS instruction_cid,",
      "  instructions.payload->'batchId'->>'unpack' AS batch_id,",
      "  daml_set_text_values(instructions.payload->'requestors') AS requestors,",
      "  bs.contract_id AS batch_cid,",
      "  instructions_min_offsets.min_create_offset AS witness_at_offset,",
      "  instructions_min_offsets.min_create_effective_time AS witness_effective_at,",
      "  instructions.payload->'id'->>'unpack' AS instruction_id,",
      "  instructions.created_at_offset AS instruction_create_offset,",
      "  instruction_archive.archive_event_id AS instruction_archive_event_id,",
      "  instruction_archive.archived_at_offset AS instruction_archive_at_offset,",
      "  instruction_archive.archived_effective_at AS instruction_archive_effective_at,",
      //"  executions.contract_id IS NOT NULL AS instruction_executed,",
      // "  false AS instruction_executed,",
      "  bs.payload AS batch_payload,",
      "  instructions.payload AS instruction_payload",
      "FROM (\n" + instructionsMinOffsets + "\n) AS instructions_min_offsets",
      "INNER JOIN creates(?) AS instructions ON",
      "  instructions.payload->'batchId'->>'unpack' = instructions_min_offsets.batch_id AND",
      "  daml_set_text_values(instructions.payload->'requestors') = instructions_min_offsets.requestors",
      "LEFT JOIN archives(?) AS instruction_archive ON",
      "  instructions.contract_id = instruction_archive.contract_id",
      "LEFT JOIN (\n" + selectBatches + "\n) AS bs ON",
      "  bs.payload->'id'->>'unpack' = instructions.payload->'batchId'->>'unpack' AND",
      "  daml_set_text_values(bs.payload->'requestors') = daml_set_text_values(instructions.payload->'requestors')",
      // "LEFT JOIN exercises(?) AS executions ON instruction_archive.contract_id = executions.contract_id",
      "ORDER BY",
      "  witness_at_offset DESC,",
      "  batch_id,",
      "  requestors,",
      "  instruction_id,",
      "  instruction_create_offset DESC"
    );
    final var settlementSingles = jdbcTemplate.query(
      selectSettlements,
      ps -> {
        int pos = 0;
        pos = instructionMinOffsetsSetter.apply(pos, ps);
        ps.setString(++pos, fullyQualified(daml.finance.interface$.settlement.instruction.Instruction.TEMPLATE_ID));
        ps.setString(++pos, fullyQualified(daml.finance.interface$.settlement.instruction.Instruction.TEMPLATE_ID));
        pos = batchesSetter.apply(pos, ps);
        // ps.setString(
        //   ++pos,
        //   daml.finance.interface$.settlement.instruction.Instruction.TEMPLATE_ID.getPackageId() + ":" +
        //   daml.finance.interface$.settlement.instruction.Instruction.TEMPLATE_ID.getModuleName() + ":" +
        //   daml.finance.interface$.settlement.instruction.Instruction.CHOICE_Execute.name
        // );
      },
      new SettlementsResultSetExtractor(ledgerClient, readAs)
    );
    return Flowable
      .fromIterable(settlementSingles)
      .flatMapSingle(s -> s)
      .toList()
      .blockingGet();
  }

  private static class AccountRowMapper implements RowMapper<AccountSummary<String, JsonObject>> {
    @Override
    public AccountSummary<String, JsonObject> mapRow(ResultSet rs, int rowNum) throws SQLException {
      final var payload = new Gson().fromJson(rs.getString("payload"), JsonObject.class);
      return new AccountSummary<>(
        rs.getString("contract_id"),
        payload
      );
    }
  }

  private static class AccountOpenOfferRowMapper implements RowMapper<AccountOpenOfferSummary<String, JsonObject>> {
    @Override
    public AccountOpenOfferSummary<String, JsonObject> mapRow(ResultSet rs, int rowNum) throws SQLException {
      final var payload = new Gson().fromJson(rs.getString("payload"), JsonObject.class);
      return new AccountOpenOfferSummary<>(
        rs.getString("contract_id"),
        payload,
        getTransactionDetailProper(rs, "created").orElseThrow(() ->
          new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR)
        )
      );
    }
  }

  private static class BalanceRowMapperWithAccount implements RowMapper<Balance> {
    private final AccountKey account;

    public BalanceRowMapperWithAccount(AccountKey account) {
      this.account = account;
    }
    @Override
    public Balance mapRow(ResultSet rs, int rowNum) throws SQLException {
      return new Balance(
        account,
        getInstrumentKey(rs),
        Optional.ofNullable(rs.getBigDecimal("unlocked_balance")).orElse(BigDecimal.ZERO),
        Optional.ofNullable(rs.getBigDecimal("locked_balance")).orElse(BigDecimal.ZERO)
      );
    }
  }

  private static class HoldingsRowMapper implements RowMapper<HoldingSummary> {
    @Override
    public HoldingSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      return new HoldingSummary(
        rs.getString("contract_id"),
        new Gson().fromJson(rs.getString("payload"), JsonObject.class),
        getTransactionDetail_(rs, "created")
      );
    }
  }

  private static class IssuersRowMapper implements RowMapper<IssuerSummary> {
    @Override
    public IssuerSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      return new IssuerSummary(
        new TokenIssuerSummary(
          rs.getString("contract_id"),
          new Gson().fromJson(rs.getString("token_issuer_payload"), JsonObject.class)
        )
      );
    }
  }

  private static class SettlementsResultSetExtractor implements ResultSetExtractor<
    List<
      Single<
        SettlementSummary<JsonObject, JsonObject, String, JsonObject, String, JsonObject, JsonObject>
      >
    >
  > {
    private final LedgerClient ledgerClient;
    private final java.util.Set<String> readAs;

    public SettlementsResultSetExtractor(LedgerClient ledgerClient, List<String> readAs) {
      this.ledgerClient = ledgerClient;
      this.readAs = Set.copyOf(readAs);
    }

    private void processCurrent(
      List<
        Single<
          SettlementSummary<JsonObject, JsonObject, String, JsonObject, String, JsonObject, JsonObject>
        >
      > settlements,
      SettlementSummary<JsonObject, JsonObject, String, JsonObject, String, JsonObject, JsonObject> current,
      Optional<TransactionDetail> currentArchive,
      Optional<String> currentArchiveEventId
    ) {
      if (current != null) {
        if (currentArchiveEventId.isPresent()) {
          settlements.add(
            getExecution(
              ledgerClient,
              currentArchiveEventId.get(),
              readAs
            ).map(e -> {
              if (e.isPresent()) {
                return new SettlementSummary<>(
                  current.batchId,
                  current.requestors,
                  current.settlers,
                  current.batchCid,
                  current.contextId,
                  current.description,
                  current.steps,
                  current.witness,
                  currentArchive
                );
              } else {
                return current;
              }
            })
          );
        } else {
          settlements.add(Single.just(current));
        }
      }
    }

    @Override
    public List<
      Single<
        SettlementSummary<JsonObject, JsonObject, String, JsonObject, String, JsonObject, JsonObject>
      >
    > extractData(ResultSet rs) throws SQLException, DataAccessException {
      final var settlements = new ArrayList<
        Single<
         SettlementSummary<JsonObject, JsonObject, String, JsonObject, String, JsonObject, JsonObject>
        >
      >();
      SettlementSummary<JsonObject, JsonObject, String, JsonObject, String, JsonObject, JsonObject> current = null;
      Optional<TransactionDetail> currentArchive = Optional.empty();
      Optional<String> currentArchiveEventId = Optional.empty();
      da.set.types.Set<String> currentRequestors = null;

      while (rs.next()) {
        final var instructionPayload = new Gson().fromJson(
          rs.getString("instruction_payload"),
          JsonObject.class
        );

        final var batchPayload = new Gson().fromJson(rs.getString("batch_payload"), JsonObject.class);

        // Batch
        final var batchId = instructionPayload.getAsJsonObject("batchId");
        final var requestors = instructionPayload.getAsJsonObject("requestors");
        final var requestorsSet = asDamlSet(requestors);
        final var settlers = instructionPayload.getAsJsonObject("settlers");
        final var batchCid = Optional.ofNullable(rs.getString("batch_cid"));
        final Optional<JsonObject> contextId = batchPayload != null &&
          !batchPayload.get("contextId").isJsonNull() ?
          Optional.ofNullable(batchPayload.getAsJsonObject("contextId")) :
          Optional.empty() ;
        final Optional<String> description = batchPayload == null ?
          Optional.empty() :
          Optional.ofNullable(
            batchPayload.getAsJsonPrimitive("description")
          ).map(JsonPrimitive::getAsString);
        final var batchCreate = getTransactionDetailProper(rs, "witness")
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));

        final var step = new SettlementStep<>(
          instructionPayload.getAsJsonObject("routedStep"),
          instructionPayload.getAsJsonObject("id"),
          rs.getString("instruction_cid"),
          instructionPayload.getAsJsonObject("allocation"),
          instructionPayload.getAsJsonObject("approval")
        );
        final Optional<TransactionDetail> archive = getTransactionDetailProper(rs, "instruction_archive");
        final Optional<String> instructionArchiveEventId = Optional.ofNullable(rs.getString("instruction_archive_event_id"));

        if (current == null || !current.batchId.equals(batchId) || !requestorsSet.equals(currentRequestors)) {
          // We have reached a new Batch so we must add the current one into the resulting List
          processCurrent(settlements, current, currentArchive, currentArchiveEventId);
          final List<SettlementStep<JsonObject, JsonObject, String, JsonObject, JsonObject>> steps = new LinkedList<>();
          steps.add(step);
          current = new SettlementSummary<>(
            batchId,
            requestors,
            settlers,
            batchCid,
            contextId,
            description,
            steps,
            batchCreate,
            Optional.empty()
          );
          currentRequestors = requestorsSet;
        } else {
          current.steps.add(step);
          current = new SettlementSummary<>(
            current.batchId,
            current.requestors,
            current.settlers,
            current.batchCid.or(() -> batchCid),
            current.contextId.or(() -> contextId),
            current.description.or(() -> description),
            current.steps,
            current.witness,
            Optional.empty()
          );
        }
        currentArchive = archive;
        currentArchiveEventId = instructionArchiveEventId;
        Util.logger.info("Current === " + current);
      }

      processCurrent(settlements, current, currentArchive, currentArchiveEventId);

      return settlements;
    }
  }

  private static class TokenInstrumentRowMapper implements RowMapper<InstrumentSummary> {
    @Override
    public InstrumentSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      return new InstrumentSummary(
        rs.getString("contract_id"),
        new Gson().fromJson(rs.getString("token_instrument_payload"), JsonObject.class)
      );
    }
  }

  private static Single<Optional<daml.finance.interface$.settlement.instruction.Execute>> getExecution(
    LedgerClient ledgerClient,
    String instructionArchivedEventId,
    java.util.Set<String> readAs
  ) {
    return ledgerClient
      .getTransactionsClient()
      .getTransactionByEventId(instructionArchivedEventId, readAs)
      .map(transactionTree -> {
        final var event = transactionTree.getEventsById().get(instructionArchivedEventId);

        if (event == null) {
          Util.logger.error("Oops the event is NULL!");
          return Optional.empty();
        }

        if (event instanceof ExercisedEvent) {
          final var exercisedEvent = (ExercisedEvent) event;
          if (
            exercisedEvent
              .getChoice()
              .equals(daml.finance.interface$.settlement.instruction.Instruction.CHOICE_Execute.name)
          ) {
            return Optional.of(
              daml.finance.interface$.settlement.instruction.Execute
                .valueDecoder()
                .decode(exercisedEvent.getChoiceArgument())
            );
          } else {
            Util.logger.info("the choice is not the execute choice");
          }
        } else {
          Util.logger.info("oops the event is not an exercised event");
        }

        return Optional.empty();
      });
  }

  private static Optional<TransactionDetail> getTransactionDetail(ResultSet rs, String prefix) throws SQLException {
    String offset = rs.getString(prefix + "_offset");
    Timestamp effectiveTime = rs.getTimestamp(prefix + "_effective_time");
    if (offset != null && effectiveTime != null) {
      return Optional.of(new TransactionDetail(offset, effectiveTime.toInstant()));
    } else {
      return Optional.empty();
    }
  }

  private static com.synfini.wallet.views.schema.TransactionDetail getTransactionDetail_(ResultSet rs, String prefix) throws SQLException {
    return new com.synfini.wallet.views.schema.TransactionDetail(
      rs.getString(prefix + "_at_offset"),
      rs.getTimestamp(prefix + "_effective_at")
    );
  }

  private static Optional<synfini.wallet.api.types.TransactionDetail> getTransactionDetailProper(ResultSet rs, String prefix) throws SQLException {
    final var offset = rs.getString(prefix + "_at_offset");
    final var effectiveAt = rs.getTimestamp(prefix + "_effective_at");

    if (offset != null && effectiveAt != null) {
      return Optional.of(
        new synfini.wallet.api.types.TransactionDetail(offset, effectiveAt.toInstant())
      );
    } else {
      return Optional.empty();
    }
  }

  private static InstrumentKey getInstrumentKey(ResultSet rs) throws SQLException {
    return new InstrumentKey(
      rs.getString("instrument_depository"),
      rs.getString("instrument_issuer"),
      new Id(rs.getString("instrument_id")),
      rs.getString("instrument_version")
    );
  }

  private static Optional<Lock> getLock(ResultSet rs) throws SQLException {
    String lockType = rs.getString("lock_type");
    if (lockType == null) {
      return Optional.empty();
    } else {
      LockType l = "semaphore".equals(lockType) ? LockType.SEMAPHORE : LockType.REENTRANT;
      da.set.types.Set<String> lockers = arrayToSet(rs.getArray("lockers"));
      da.set.types.Set<String> lockContext = arrayToSet(rs.getArray("lock_context"));
      return Optional.of(
        new Lock(lockers, lockContext, l)
      );
    }
  }

  private static da.set.types.Set<String> arrayToSet(java.sql.Array array) throws SQLException {
    String[] stringArray = (String[]) array.getArray();
    return new da.set.types.Set<>(
      Arrays.stream(stringArray).collect(Collectors.toMap(Function.identity(), x -> Unit.getInstance()))
    );
  }

  private static da.set.types.Set<String> asDamlSet(JsonObject jsonDamlSet) {
    final var jsonArray = jsonDamlSet.get("map").getAsJsonArray();
    final Map<String, Unit> map = new HashMap<>();

    for (JsonElement jsonElement : jsonArray) {
      map.put(jsonElement.getAsJsonArray().get(0).getAsString(), Unit.getInstance());
    }

    return new da.set.types.Set<>(map);
  }

  private Array asSqlArray(List<String> list) throws SQLException {
    final Array arr;
    Connection conn = null;
    try {
      conn = pgDataSource.getConnection();
      arr = conn.createArrayOf("text", list.toArray());
    } finally {
      if (conn != null) {
        conn.close();
      }
    }
    return arr;
  }

  private static String multiLineQuery(String... lines) {
    return Arrays.asList(lines).stream().reduce((a, b) -> a + "\n" + b).orElse("");
  }

  private static String fullyQualified(Identifier identifier) {
    return identifier.getPackageId() + ":" + identifier.getModuleName() + ":" + identifier.getEntityName();
  }
}
