package com.synfini.wallet.views;

import com.daml.ledger.javaapi.data.Identifier;
import com.daml.ledger.javaapi.data.Unit;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import com.synfini.wallet.views.schema.response.AccountSummary;
import com.synfini.wallet.views.schema.response.HoldingSummary;
import com.synfini.wallet.views.schema.response.InstrumentSummary;
import com.synfini.wallet.views.schema.response.IssuerSummary;
import com.synfini.wallet.views.schema.response.TokenIssuerSummary;
import com.synfini.wallet.views.schema.response.AccountOpenOfferSummary;

import da.types.Tuple2;
import daml.finance.interface$.account.account.Account;
import daml.finance.interface$.account.account.Controllers;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.holding.base.Lock;
import daml.finance.interface$.holding.base.LockType;
import daml.finance.interface$.holding.base.View;
import daml.finance.interface$.holding.factory.Factory;
import daml.finance.interface$.instrument.base.instrument.Instrument;
import daml.finance.interface$.instrument.token.types.Token;
import daml.finance.interface$.settlement.batch.Batch;
import daml.finance.interface$.settlement.instruction.Instruction;
import daml.finance.interface$.settlement.types.Allocation;
import daml.finance.interface$.settlement.types.Approval;
import daml.finance.interface$.settlement.types.InstructionKey;
import daml.finance.interface$.settlement.types.RoutedStep;
import daml.finance.interface$.settlement.types.allocation.*;
import daml.finance.interface$.settlement.types.approval.*;
import daml.finance.interface$.types.common.types.AccountKey;
import daml.finance.interface$.types.common.types.Id;
import daml.finance.interface$.types.common.types.InstrumentKey;
import daml.finance.interface$.types.common.types.Quantity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementSetter;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;
import synfini.interface$.onboarding.account.openoffer.openoffer.OpenOffer;
import synfini.interface$.onboarding.issuer.instrument.token.issuer.Issuer;
// import synfini.wallet.api.types.*;
import synfini.wallet.api.types.Balance;
import synfini.wallet.api.types.SettlementStep;
import synfini.wallet.api.types.SettlementSummary;
import synfini.wallet.api.types.TransactionDetail;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class WalletRepository {
  private final JdbcTemplate jdbcTemplate;
  private final DataSource pgDataSource;

  @Autowired
  public WalletRepository(JdbcTemplate jdbcTemplate, DataSource pgDataSource) {
    this.jdbcTemplate = jdbcTemplate;
    this.pgDataSource = pgDataSource;
  }

  public List<AccountSummary> accounts(Optional<String> custodian, String owner) {
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

  public List<AccountOpenOfferSummary> accountOpenOffers(List<String> readAs) {
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

  public List<SettlementSummary> settlements(
    List<String> readAs,
    Optional<String> before,
    long limit
  ) {
    final var selectInstructionsWithMinOffsets =
      "SELECT\n" +
      "  batch_id,\n" +
      "  requestors_hash,\n" +
      "  min(create_offset) min_create_offset,\n" +
      "  min(create_effective_time) min_create_effective_time\n" +
      "FROM instructions JOIN instruction_witnesses ON instructions.cid = instruction_witnesses.cid\n" +
      "WHERE instructions.create_offset IS NOT NULL AND instruction_witnesses.party = ANY(?)\n" +
      "GROUP BY (batch_id, requestors_hash)\n" +
      "HAVING ? IS NULL OR min(create_offset) < ?\n" +  // Must occur prior to "before"
      "ORDER BY min_create_offset DESC\n" +
      "LIMIT ?";
    final var selectBatches =
      "SELECT\n" +
      "  batches.cid,\n" +
      "  batches.batch_id,\n" +
      "  batches.requestors_hash,\n" +
      "  batches.description,\n" +
      "  batches.context_id\n" +
      "FROM batches JOIN batch_witnesses ON batches.cid = batch_witnesses.cid\n" +
      "WHERE batch_witnesses.party = ANY(?)";
    final var selectSettlements =
      "SELECT DISTINCT ON (witness_offset, batch_id, requestors_hash, instruction_id)\n" +
      "  instructions.batch_id,\n" +
      "  instructions.requestors,\n" +
      "  instructions.requestors_hash,\n" +
      "  instructions.settlers,\n" +
      "  bs.cid batch_cid,\n" +
      "  bs.context_id,\n" +
      "  bs.description,\n" +
      "  instructions_min_offsets.min_create_offset witness_offset,\n" +
      "  instructions_min_offsets.min_create_effective_time witness_effective_time,\n" +
      "  instructions.instruction_id,\n" +
      "  instructions.cid instruction_cid,\n" +
      "  instructions.sender,\n" +
      "  instructions.receiver,\n" +
      "  instructions.custodian,\n" +
      "  instructions.amount,\n" +
      "  instructions.instrument_issuer,\n" +
      "  instructions.instrument_depository,\n" +
      "  instructions.instrument_id,\n" +
      "  instructions.instrument_version,\n" +
      "  instructions.allocation_pledge_cid,\n" +
      "  instructions.allocation_credit_receiver,\n" +
      "  instructions.allocation_pass_through_from,\n" +
      "  instructions.allocation_pass_through_from_account_id,\n" +
      "  instructions.allocation_settle_off_ledger,\n" +
      "  instructions.approval_account_id,\n" +
      "  instructions.approval_pass_through_to,\n" +
      "  instructions.approval_debit_sender,\n" +
      "  instructions.approval_settle_off_ledger,\n" +
      "  instructions.create_offset instruction_create_offset,\n" +
      "  instructions.archive_offset instruction_archive_offset,\n" +
      "  instructions.archive_effective_time instruction_archive_effective_time,\n" +
      "  instruction_executions.instruction_cid IS NOT NULL instruction_executed\n" +
      "FROM (" + selectInstructionsWithMinOffsets + ") instructions_min_offsets JOIN instructions ON\n" +
      "  instructions.batch_id = instructions_min_offsets.batch_id AND\n" +
      "  instructions.requestors_hash = instructions_min_offsets.requestors_hash\n" +
      "LEFT JOIN (" + selectBatches + ") bs ON\n" +
      "  bs.batch_id = instructions.batch_id AND bs.requestors_hash = instructions.requestors_hash\n" +
      "JOIN instruction_witnesses ON instructions.cid = instruction_witnesses.cid\n" +
      "LEFT JOIN instruction_executions ON instructions.cid = instruction_executions.instruction_cid\n" +
      "WHERE instruction_witnesses.party = ANY(?)\n" +
      "ORDER BY\n" +
      "  witness_offset DESC,\n" +
      "  batch_id,\n" +
      "  requestors_hash,\n" +
      "  instruction_id,\n" +
      "  instruction_create_offset DESC";
    return jdbcTemplate.query(
      selectSettlements,
      ps -> {
        final var r = asSqlArray(readAs);
        ps.setArray(1, r);

        final var b = before.orElse(null);
        ps.setString(2, b);
        ps.setString(3, b);
        ps.setLong(4, limit);

        ps.setArray(5, r);
        ps.setArray(6, r);
      },
      new SettlementsResultSetExtractor()
    );
  }

  private static class AccountRowMapper implements RowMapper<AccountSummary> {

    @Override
    public AccountSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      final var payload = new Gson().fromJson(rs.getString("payload"), JsonObject.class);
      return new AccountSummary(
        rs.getString("contract_id"),
        payload
      );
    }
  }

  private static class AccountOpenOfferRowMapper implements RowMapper<AccountOpenOfferSummary> {
    @Override
    public AccountOpenOfferSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      final var payload = new Gson().fromJson(rs.getString("payload"), JsonObject.class);
      return new AccountOpenOfferSummary(
        rs.getString("contract_id"),
        payload,
        getTransactionDetail_(rs, "created")
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

  private static class SettlementsResultSetExtractor implements ResultSetExtractor<List<SettlementSummary>> {
    @Override
    public List<SettlementSummary> extractData(ResultSet rs) throws SQLException, DataAccessException {
      final var settlements =  new ArrayList<SettlementSummary>();
      SettlementSummary current = null;
      int currentRequestorsHash = 0;

      while (rs.next()) {
        // Batch
        final var batchId = new Id(rs.getString("batch_id"));
        final var requestorsHash = rs.getInt("requestors_hash");
        final var requestors = arrayToSet(rs.getArray("requestors"));
        final var settlers = arrayToSet(rs.getArray("settlers"));
        final var batchCid = Optional.ofNullable(rs.getString("batch_cid")).map(Batch.ContractId::new);
        final var contextId = Optional.ofNullable(rs.getString("context_id")).map(Id::new);
        final var description = Optional.ofNullable(rs.getString("description"));
        final var batchCreate = getTransactionDetail(rs, "witness")
          .orElseThrow(() -> new InternalError("Witness event detail not present"));

        // Instruction
        final var instrumentKey = new InstrumentKey(
          rs.getString("instrument_depository"),
          rs.getString("instrument_issuer"),
          new Id(rs.getString("instrument_id")),
          rs.getString("instrument_version")
        );
        final var routedStep = new RoutedStep(
          rs.getString("sender"),
          rs.getString("receiver"),
          rs.getString("custodian"),
          new Quantity<>(instrumentKey, rs.getBigDecimal("amount"))
        );
        final var instructionCid = new Instruction.ContractId(rs.getString("instruction_cid"));
        final var deliveryAccountId = rs.getString("approval_account_id");
        final var approvalPassThroughTo = rs.getString("approval_pass_through_to");
        final var approvalDebitSender = rs.getBoolean("approval_debit_sender");
        final var approvalSettleOffLedger = rs.getBoolean("approval_settle_off_ledger");
        final Approval approval;
        if (deliveryAccountId != null) {
          final var deliveryAccount = new AccountKey(routedStep.custodian, routedStep.receiver, new Id(deliveryAccountId));
          if (approvalPassThroughTo != null) {
            approval = new PassThroughTo(
              new Tuple2<>(deliveryAccount, new InstructionKey(requestors, batchId, new Id(approvalPassThroughTo)))
            );
          } else {
            approval = new TakeDelivery(deliveryAccount);
          }
        } else if (approvalDebitSender) {
          approval = new DebitSender(Unit.getInstance());
        } else if (approvalSettleOffLedger) {
          approval = new SettleOffledgerAcknowledge(Unit.getInstance());
        } else {
          approval = new Unapproved(Unit.getInstance());
        }
        final var allocationPledgeCid = rs.getString("allocation_pledge_cid");
        final var allocationCreditReceiver = rs.getBoolean("allocation_credit_receiver");
        final var allocationPassThroughFrom = rs.getString("allocation_pass_through_from");
        final var allocationPassThroughFromAccountId = rs.getString("allocation_pass_through_from_account_id");
        final var allocationSettleOffLedger = rs.getBoolean("allocation_settle_off_ledger");
        final Allocation allocation;
        if (allocationPledgeCid != null) {
          allocation = new Pledge(new Base.ContractId(allocationPledgeCid));
        } else if (allocationCreditReceiver) {
          allocation = new CreditReceiver(Unit.getInstance());
        } else if (allocationPassThroughFrom != null && allocationPassThroughFromAccountId != null) {
          final var account = new AccountKey(routedStep.custodian, routedStep.sender, new Id(allocationPassThroughFromAccountId));
          allocation = new PassThroughFrom(
            new Tuple2<>(account, new InstructionKey(requestors, batchId, new Id(allocationPassThroughFrom)))
          );
        } else if (allocationSettleOffLedger) {
          allocation = new SettleOffledger(Unit.getInstance());
        } else {
          allocation = new Unallocated(Unit.getInstance());
        }
        final var step = new SettlementStep(
          routedStep,
          new Id(rs.getString("instruction_id")),
          instructionCid,
          allocation,
          approval
        );
        final Optional<TransactionDetail> execution = rs.getBoolean("instruction_executed") ?
          getTransactionDetail(rs, "instruction_archive") :
          Optional.empty();

        if (current == null || !current.batchId.equals(batchId) || requestorsHash != currentRequestorsHash) {
          if (current != null) {
            settlements.add(current);
          }
          final List<SettlementStep> steps = new LinkedList<>();
          steps.add(step);
          current = new SettlementSummary(
            batchId,
            requestors,
            settlers,
            batchCid,
            contextId,
            description,
            steps,
            batchCreate,
            execution
          );
          currentRequestorsHash = requestorsHash;
        } else {
          current.steps.add(step);
          current = new SettlementSummary(
            current.batchId,
            current.requestors,
            current.settlers,
            current.batchCid.or(() -> batchCid),
            current.contextId.or(() -> contextId),
            current.description.or(() -> description),
            current.steps,
            current.witness,
            current.execution.or(() -> execution)
          );
        }
      }

      if (current != null) {
        settlements.add(current);
      }

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
