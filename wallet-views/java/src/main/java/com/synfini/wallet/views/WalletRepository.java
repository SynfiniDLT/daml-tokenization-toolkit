package com.synfini.wallet.views;

import com.daml.ledger.javaapi.data.Unit;
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
import synfini.wallet.api.types.*;

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
    final var queryAccounts =
      "SELECT DISTINCT ON (custodian, owner, account_id) *\n" +
      "FROM accounts\n" +
      "ORDER BY custodian, owner, account_id, create_offset DESC\n";
    final var queryCreates =
      "SELECT DISTINCT ON (custodian, owner, account_id)\n" +
      "  a.create_offset,\n" +
      "  a.create_effective_time,\n" +
      "  a.owner,\n" +
      "  a.custodian,\n" +
      "  a.account_id\n" +
      "FROM accounts a INNER JOIN account_factory_events e ON e.is_create AND a.cid = e.account_cid\n" +
      "ORDER BY custodian, owner, account_id, create_offset";
    final var queryRemoves =
      "SELECT DISTINCT ON (custodian, owner, account_id)\n" +
      "  true is_removed,\n" +
      "  a.owner AS owner,\n" +
      "  a.custodian custodian,\n" +
      "  a.account_id account_id\n" +
      "FROM accounts a INNER JOIN account_factory_events e ON\n" +
      "  NOT e.is_create AND a.owner = e.account_owner AND a.custodian = e.account_custodian AND a.account_id = e.account_id";
    return jdbcTemplate.query(
    "SELECT\n" +
      "  latest_accounts.cid,\n" +
      "  latest_accounts.custodian,\n" +
      "  latest_accounts.owner,\n" +
      "  latest_accounts.account_id,\n" +
      "  latest_accounts.controllers_incoming,\n" +
      "  latest_accounts.controllers_outgoing,\n" +
      "  latest_accounts.holding_factory_cid,\n" +
      "  latest_accounts.description,\n" +
      "  creates.create_offset,\n" +
      "  creates.create_effective_time,\n" +
      "  (CASE WHEN is_removed THEN latest_accounts.archive_offset ELSE NULL END) remove_offset,\n" +
      "  (CASE WHEN is_removed THEN latest_accounts.archive_effective_time ELSE NULL END) remove_effective_time\n" +
      "FROM (" + queryAccounts + ") latest_accounts\n" +
      "LEFT OUTER JOIN  (" + queryCreates + ") creates ON\n" +
      "  latest_accounts.owner = creates.owner AND\n" +
      "  latest_accounts.custodian = creates.custodian AND\n" +
      "  latest_accounts.account_id = creates.account_id\n" +
      "LEFT OUTER JOIN (" + queryRemoves + ") removes ON\n" +
      "  latest_accounts.owner = removes.owner AND\n" +
      "  latest_accounts.custodian = removes.custodian AND\n" +
      "  latest_accounts.account_id = removes.account_id\n" +
      "WHERE (? IS NULL OR latest_accounts.custodian = ?) AND latest_accounts.owner = ?",
      ps -> {
        ps.setString(1, custodian.orElse(null));
        ps.setString(2, custodian.orElse(null));
        ps.setString(3, owner);
      },
      new AccountRowMapper()
    );
  }

  public List<AccountOpenOfferSummary> accountOpenOffers(List<String> readAs) {
    return jdbcTemplate.query(
      "SELECT\n" +
        "  o.cid cid,\n" +
        "  o.custodian custodian,\n" +
        "  o.permitted_owners permitted_owners,\n" +
        "  o.description description,\n" +
        "  o.owner_incoming_controlled owner_incoming_controlled,\n" +
        "  o.owner_outgoing_controlled owner_outgoing_controlled,\n" +
        "  o.additional_controllers_incoming additional_controllers_incoming,\n" +
        "  o.additional_controllers_outgoing additional_controllers_outgoing,\n" +
        "  o.account_factory_cid account_factory_cid,\n" +
        "  o.holding_factory_cid holding_factory_cid,\n" +
        "  o.create_offset create_offset,\n" +
        "  o.create_effective_time create_effective_time\n" +
        "FROM account_open_offers o\n" +
        "INNER JOIN account_open_offer_witnesses w ON o.cid = w.cid\n" +
        "WHERE o.archive_offset IS NULL AND w.party = ANY(?)",
      ps -> {
        ps.setArray(1, asSqlArray(readAs));
      },
      new AccountOpenOfferRowMapper()
    );
  }

  public List<Balance> balanceByAccount(AccountKey account) {
    return jdbcTemplate.query(
    "SELECT\n" +
      "  instrument_depository,\n" +
      "  instrument_id,\n" +
      "  instrument_issuer,\n" +
      "  instrument_version,\n" +
      "  sum(CASE WHEN lock_type IS NULL THEN amount ELSE 0 END) unlocked_balance,\n" +
      "  sum(CASE WHEN lock_type IS NOT NULL THEN amount ELSE 0 END) locked_balance\n" +
      "FROM holdings\n" +
      "WHERE\n" +
      "  archive_offset IS NULL AND\n" +
      "  account_custodian = ? AND\n" +
      "  account_owner = ? AND\n" +
      "  account_id = ?\n" +
      "GROUP BY\n" +
      "  instrument_depository,\n" +
      "  instrument_issuer,\n" +
      "  instrument_id,\n" +
      "  instrument_version",
      ps -> {
        ps.setString(1, account.custodian);
        ps.setString(2, account.owner);
        ps.setString(3, account.id.unpack);
      },
      new BalanceRowMapperWithAccount(account)
    );
  }

  public List<HoldingSummary> holdings(AccountKey account, InstrumentKey instrument, List<String> readAs) {
    return jdbcTemplate.query(
  "SELECT DISTINCT ON (cid)\n" +
      "  h.cid cid,\n" +
      "  h.amount amount,\n" +
      "  h.lockers lockers,\n" +
      "  h.lock_context lock_context,\n" +
      "  h.lock_type lock_type,\n" +
      "  h.create_offset create_offset,\n" +
      "  h.create_effective_time create_effective_time\n" +
      "FROM holdings h INNER JOIN holding_witnesses ON h.cid = holding_witnesses.cid\n" +
      "WHERE\n" +
      "  holding_witnesses.party = ANY(?) AND\n" +
      "  h.account_custodian = ? AND\n" +
      "  h.account_owner = ? AND\n" +
      "  h.account_id = ? AND\n" +
      "  h.instrument_depository = ? AND\n" +
      "  h.instrument_issuer = ? AND\n" +
      "  h.instrument_id = ? AND\n" +
      "  h.instrument_version = ? AND\n" +
      "  h.archive_offset IS NULL\n" +
      "ORDER BY cid",
      ps -> {
        ps.setArray(1, asSqlArray(readAs));
        ps.setString(2, account.custodian);
        ps.setString(3, account.owner);
        ps.setString(4, account.id.unpack);
        ps.setString(5, instrument.depository);
        ps.setString(6, instrument.issuer);
        ps.setString(7, instrument.id.unpack);
        ps.setString(8, instrument.version);
      },
      new HoldingsRowMapper(account, instrument)
    );
  }

  public List<InstrumentSummary> instruments(
    String depository,
    String issuer,
    Optional<Id> id,
    Optional<String> version,
    List<String> readAs
  ) {
    final var commonSelect = "SELECT DISTINCT ON (instrument_depository, instrument_issuer, instrument_id, instrument_version)\n" +
      "  t.cid cid,\n" +
      "  t.instrument_depository instrument_depository,\n" +
      "  t.instrument_issuer instrument_issuer,\n" +
      "  t.instrument_id instrument_id,\n" +
      "  t.instrument_version instrument_version,\n" +
      "  t.description description,\n" +
      "  t.valid_as_of valid_as_of";
    final var commonWhereOrder = "WHERE\n" +
      "  instrument_witnesses.party = ANY(?) AND\n" +
      "  t.instrument_depository = ? AND\n" +
      "  t.instrument_issuer = ? AND\n" +
      "  (? IS NULL OR t.instrument_id = ?) AND\n" +
      "  (? IS NULL OR t.instrument_version = ?) AND\n" +
      "  t.archive_offset IS NULL\n" +
      "ORDER BY instrument_depository, instrument_issuer, instrument_id, instrument_version";
    final PreparedStatementSetter commonSetVars = ps -> {
      ps.setArray(1, asSqlArray(readAs));
      ps.setString(2, depository);
      ps.setString(3, issuer);
      final var idStr = id.map(i -> i.unpack).orElse(null);
      ps.setString(4, idStr);
      ps.setString(5, idStr);
      final var versionStr = version.orElse(null);
      ps.setString(6, versionStr);
      ps.setString(7, versionStr);
    };
    final var instruments = jdbcTemplate.query(
    commonSelect + "\n" +
      "FROM token_instruments t INNER JOIN instrument_witnesses ON t.cid = instrument_witnesses.cid\n" +
      commonWhereOrder,
      commonSetVars,
      new TokenInstrumentRowMapper()
    );

    instruments.addAll(
      jdbcTemplate.query(
      commonSelect + ",\n" +
        "  t.owner AS owner,\n" +
        "  t.attributes attributes\n" +
        "FROM pba_instruments t INNER JOIN instrument_witnesses ON t.cid = instrument_witnesses.cid\n" +
        commonWhereOrder,
        commonSetVars,
        new PbtInstrumentRowMapper()
      )
    );

    return instruments;
  }

  public List<IssuerSummary> issuers(Optional<String> depository, Optional<String> issuer, List<String> readAs) {
    return jdbcTemplate.query(
      "SELECT\n" +
      "  i.cid cid,\n" +
      "  i.depository depository,\n" +
      "  i.issuer issuer,\n" +
      "  i.instrument_factory_cid instrument_factory_cid\n" +
      "FROM token_instrument_issuers i INNER JOIN token_instrument_issuer_witnesses w ON i.cid = w.cid\n" +
      "WHERE (? IS NULL OR i.depository = ?) AND (? IS NULL OR i.issuer = ?) AND w.party = ANY(?)",
      ps -> {
        ps.setString(1, depository.orElse(null));
        ps.setString(2, depository.orElse(null));

        ps.setString(3, issuer.orElse(null));
        ps.setString(4, issuer.orElse(null));

        ps.setArray(5, asSqlArray(readAs));
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
      return new AccountSummary(
        new Account.ContractId(rs.getString("cid")),
        new daml.finance.interface$.account.account.View(
          rs.getString("custodian"),
          rs.getString("owner"),
          new Id(rs.getString("account_id")),
          rs.getString("description"),
          new Factory.ContractId(rs.getString("holding_factory_cid")),
          new Controllers(
            arrayToSet(rs.getArray("controllers_outgoing")),
            arrayToSet(rs.getArray("controllers_incoming"))
          )
        ),
        getTransactionDetail(rs, "create"),
        getTransactionDetail(rs, "remove")
      );
    }
  }

  private static class AccountOpenOfferRowMapper implements RowMapper<AccountOpenOfferSummary> {
    @Override
    public AccountOpenOfferSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      final var permittedOwnersArray = rs.getArray("permitted_owners");
      final Optional<da.set.types.Set<String>> permittedOwners = permittedOwnersArray == null ?
        Optional.empty() :
        Optional.of(arrayToSet(permittedOwnersArray));
      return new AccountOpenOfferSummary(
        new OpenOffer.ContractId(rs.getString("cid")),
        new synfini.interface$.onboarding.account.openoffer.openoffer.View(
          rs.getString("custodian"),
          rs.getBoolean("owner_incoming_controlled"),
          rs.getBoolean("owner_outgoing_controlled"),
          new Controllers(
            arrayToSet(rs.getArray("additional_controllers_outgoing")),
            arrayToSet(rs.getArray("additional_controllers_incoming"))
          ),
          permittedOwners,
          new daml.finance.interface$.account.factory.Factory.ContractId(rs.getString("account_factory_cid")),
          new daml.finance.interface$.holding.factory.Factory.ContractId(rs.getString("holding_factory_cid")),
          rs.getString("description")
        ),
        getTransactionDetail(rs, "create")
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
    private final AccountKey account;
    private final InstrumentKey instrument;

    public HoldingsRowMapper(AccountKey account, InstrumentKey instrument) {
      this.account = account;
      this.instrument = instrument;
    }

    @Override
    public HoldingSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      return new HoldingSummary(
        new Base.ContractId(rs.getString("cid")),
        new View(
          instrument,
          account,
          rs.getBigDecimal("amount"),
          getLock(rs)
        ),
        getTransactionDetail(rs, "create")
      );
    }
  }

  private static class IssuersRowMapper implements RowMapper<IssuerSummary> {
    @Override
    public IssuerSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      return new IssuerSummary(
        Optional.of(
          new TokenIssuerSummary(
            new Issuer.ContractId(rs.getString("cid")),
            new synfini.interface$.onboarding.issuer.instrument.token.issuer.View(
              rs.getString("depository"),
              rs.getString("issuer"),
              new daml.finance.interface$.instrument.token.factory.Factory.ContractId(
                rs.getString("instrument_factory_cid")
              )
            )
          )
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
        new Instrument.ContractId(rs.getString("cid")),
        Optional.of(
          new daml.finance.interface$.instrument.token.instrument.View(
            new Token(
              getInstrumentKey(rs),
              rs.getString("description"),
              rs.getTimestamp("valid_as_of").toInstant()
            )
          )
        ),
        Optional.empty()
      );
    }
  }

  private static class PbtInstrumentRowMapper implements RowMapper<InstrumentSummary> {
    @Override
    public InstrumentSummary mapRow(ResultSet rs, int rowNum) throws SQLException {
      return new InstrumentSummary(
        new Instrument.ContractId(rs.getString("cid")),
        Optional.empty(),
        Optional.of(
          new synfini.interface$.instrument.partyboundattributes.instrument.View(
            getInstrumentKey(rs),
            rs.getString("description"),
            rs.getTimestamp("valid_as_of").toInstant(),
            rs.getString("owner"),
            (Map<String, String>) rs.getObject("attributes")
          )
        )
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

  private Array asSqlArray(List<String> list) throws SQLException {
    final Array arr;
    Connection conn = null;
    try {
      conn = pgDataSource.getConnection();
      arr = conn.createArrayOf("varchar", list.toArray());
    } finally {
      if (conn != null) {
        conn.close();
      }
    }
    return arr;
  }
}
