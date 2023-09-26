package com.synfini.wallet.views.projection.generators.account;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ArchivedEvent;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.DamlRecord;
import com.daml.ledger.javaapi.data.Event;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.Util;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.AccountEvent;
import daml.finance.interface$.account.account.Account;
import daml.finance.interface$.account.account.View;

import java.sql.Connection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public class AccountsProjectionGenerator implements ProjectionGenerator<Event, AccountEvent> {
  private final String readAs;
  private final Connection connection;

  public AccountsProjectionGenerator(String readAs, Connection connection) {
    this.readAs = readAs;
    this.connection = connection;
  }

  @Override
  public BatchSource<Event> source(GrpcClientSettings grpcClientSettings) {
    return BatchSource.events(grpcClientSettings);
  }

  @Override
  public Projection<Event> projection() {
    return Projection.create(
      new ProjectionId("holdings-projection-for-" + readAs),
      ProjectionFilter.singleContractType(Set.of(readAs), Account.INTERFACE)
    );
  }

  @Override
  public Project<Event, AccountEvent> project() {
    return envelope -> {
      if (envelope.getEvent() instanceof CreatedEvent) {
        final var createdEvent = (CreatedEvent) envelope.getEvent();
        final var viewRecord = createdEvent.getInterfaceViews().get(Account.INTERFACE.TEMPLATE_ID);
        if (viewRecord == null) throw new InternalError("Interface view not available");
        final var view = View.valueDecoder().decode(viewRecord);
        return List.of(
          new AccountEvent(
            createdEvent.getContractId(),
            envelope.getOffset(),
            envelope.getLedgerEffectiveTime(),
            Optional.of(view)
          )
        );
      } else if (envelope.getEvent() instanceof ArchivedEvent) {
        return List.of(
          new AccountEvent(
            envelope.getEvent().getContractId(),
            envelope.getOffset(),
            envelope.getLedgerEffectiveTime(),
            Optional.empty()
          )
        );
      }
      return Collections.emptyList();
    };
  }

  @Override
  public BatchRows<AccountEvent, JdbcAction> batchRows() {
    final var accountsTable = new ProjectionTable("accounts");
    final Binder<AccountEvent> bind = Sql.<AccountEvent>binder(
      "INSERT INTO " + accountsTable.getName() + "\n" +
       "        (account_id,  custodian,  owner,  description,  holding_factory_cid,  cid,  controllers_incoming,  controllers_outgoing,  create_offset,  create_effective_time)\n" +
       "VALUES (:account_id, :custodian, :owner, :description, :holding_factory_cid, :cid, :controllers_incoming, :controllers_outgoing, :create_offset, :create_effective_time)\n" +
       "ON CONFLICT(cid) DO UPDATE\n" +
       "SET\n" +
       "  archive_offset = CASE WHEN :update_archive_offset THEN :archive_offset ELSE " + accountsTable.getName() + ".archive_offset END,\n" +
       "  archive_effective_time = CASE WHEN :update_archive_effective_time THEN :archive_effective_time ELSE " + accountsTable.getName() + ".archive_effective_time END\n"
   )
   .bind("account_id", e -> e.view.map(v -> v.id.unpack).orElse(""), Bind.String())
   .bind("custodian", e -> e.view.map(v -> v.custodian).orElse(""), Bind.String())
   .bind("owner", e -> e.view.map(v -> v.owner).orElse(""), Bind.String())
   .bind("description", e -> e.view.map(v -> v.description).orElse(""), Bind.String())
   .bind("holding_factory_cid", e -> e.view.map(v -> v.holdingFactoryCid.contractId).orElse(""), Bind.String())
   .bind("cid", e -> e.contractId, Bind.String())
   .bind("controllers_incoming", e -> Util.setToArray(e.view.map(v -> v.controllers.incoming), connection), Bind.Array())
   .bind("controllers_outgoing", e -> Util.setToArray(e.view.map(v -> v.controllers.outgoing), connection), Bind.Array())
   .bind("create_offset", e -> e.offset.map(Offset::getValue), Bind.Optional(Bind.String()))
   .bind("create_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()))
   .bind("update_archive_offset",  e -> e.view.isEmpty(), Bind.Boolean())
   .bind("archive_offset", e -> e.offset.map(Offset::getValue), Bind.Optional(Bind.String()))
   .bind("update_archive_effective_time",  e -> e.view.isEmpty(), Bind.Boolean())
   .bind("archive_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()));

    return UpdateMany.create(bind);
  }
}
