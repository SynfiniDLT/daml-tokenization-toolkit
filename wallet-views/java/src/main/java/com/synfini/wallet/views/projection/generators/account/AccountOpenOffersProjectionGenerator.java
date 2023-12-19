package com.synfini.wallet.views.projection.generators.account;

import akka.grpc.GrpcClientSettings;
import com.daml.ledger.javaapi.data.ArchivedEvent;
import com.daml.ledger.javaapi.data.CreatedEvent;
import com.daml.ledger.javaapi.data.Event;
import com.daml.projection.*;
import com.daml.projection.javadsl.BatchSource;
import com.synfini.wallet.views.Util;
import com.synfini.wallet.views.projection.ProjectionGenerator;
import com.synfini.wallet.views.projection.events.AccountEvent;
import com.synfini.wallet.views.projection.events.AccountOpenOfferEvent;
import daml.finance.interface$.account.account.Account;
import synfini.interface$.onboarding.account.openoffer.openoffer.View;
import synfini.interface$.onboarding.account.openoffer.openoffer.OpenOffer;

import java.sql.Connection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public class AccountOpenOffersProjectionGenerator implements ProjectionGenerator<Event, AccountOpenOfferEvent> {
  private final String readAs;
  private final Connection connection;

  public AccountOpenOffersProjectionGenerator(String readAs, Connection connection) {
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
      new ProjectionId("account-open-offers-projection-for-" + readAs),
      ProjectionFilter.singleContractType(Set.of(readAs), OpenOffer.INTERFACE)
    );
  }

  @Override
  public Project<Event, AccountOpenOfferEvent> project() {
    return envelope -> {
      if (envelope.getEvent() instanceof CreatedEvent) {
        final var createdEvent = (CreatedEvent) envelope.getEvent();
        final var viewRecord = createdEvent.getInterfaceViews().get(OpenOffer.INTERFACE.TEMPLATE_ID);
        if (viewRecord == null) throw new InternalError("Interface view not available");
        final var view = View.valueDecoder().decode(viewRecord);
        return List.of(
          new AccountOpenOfferEvent(
            createdEvent.getContractId(),
            envelope.getOffset(),
            envelope.getLedgerEffectiveTime(),
            Optional.of(view)
          )
        );
      } else if (envelope.getEvent() instanceof ArchivedEvent) {
        return List.of(
          new AccountOpenOfferEvent(
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
  public BatchRows<AccountOpenOfferEvent, JdbcAction> batchRows() {
    final var accountOpenOffersTable = new ProjectionTable("account_open_offers");
    final Binder<AccountOpenOfferEvent> bind = Sql.<AccountOpenOfferEvent>binder(
     "INSERT INTO " + accountOpenOffersTable.getName() + "\n" +
       "        (cid,  custodian,  permitted_owners,  description,  account_factory_cid,  holding_factory_cid,  owner_incoming_controlled,  owner_outgoing_controlled,  additional_controllers_incoming,  additional_controllers_outgoing,  create_offset,  create_effective_time)\n" +
       "VALUES (:cid, :custodian, :permitted_owners, :description, :account_factory_cid, :holding_factory_cid, :owner_incoming_controlled, :owner_outgoing_controlled, :additional_controllers_incoming, :additional_controllers_outgoing, :create_offset, :create_effective_time)\n" +
       "ON CONFLICT(cid) DO UPDATE\n" +
       "SET\n" +
       "  archive_offset = CASE WHEN :update_archive_offset THEN :archive_offset ELSE " + accountOpenOffersTable.getName() + ".archive_offset END,\n" +
       "  archive_effective_time = CASE WHEN :update_archive_effective_time THEN :archive_effective_time ELSE " + accountOpenOffersTable.getName() + ".archive_effective_time END\n"
    )
    .bind("cid", e -> e.contractId, Bind.String())
    .bind("custodian", e -> e.view.map(v -> v.custodian).orElse(""), Bind.String())
    .bind("permitted_owners", e -> e.view.flatMap(v -> v.permittedOwners).map(owners -> Util.setToArray(Optional.of(owners), connection)), Bind.Optional(Bind.Array()))
    .bind("description", e -> e.view.map(v -> v.description).orElse(""), Bind.String())
    .bind("account_factory_cid", e -> e.view.map(v -> v.accountFactoryCid.contractId).orElse(""), Bind.String())
    .bind("holding_factory_cid", e -> e.view.map(v -> v.holdingFactoryCid.contractId).orElse(""), Bind.String())
    .bind("owner_incoming_controlled", e -> e.view.map(v -> v.ownerIncomingControlled).orElse(false), Bind.Boolean())
    .bind("owner_outgoing_controlled", e -> e.view.map(v -> v.ownerOutgoingControlled).orElse(false), Bind.Boolean())
    .bind("additional_controllers_incoming", e -> Util.setToArray(e.view.map(v -> v.additionalControllers.incoming), connection), Bind.Array())
    .bind("additional_controllers_outgoing", e -> Util.setToArray(e.view.map(v -> v.additionalControllers.outgoing), connection), Bind.Array())
    .bind("create_offset", e -> e.offset.map(Offset::getValue), Bind.Optional(Bind.String()))
    .bind("create_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()))
    .bind("update_archive_offset",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_offset", e -> e.offset.map(Offset::getValue), Bind.Optional(Bind.String()))
    .bind("update_archive_effective_time",  e -> e.view.isEmpty(), Bind.Boolean())
    .bind("archive_effective_time", e -> e.effectiveTime, Bind.Optional(Bind.Instant()));

    return UpdateMany.create(bind);
  }
}
