package com.synfini.mint;

import com.daml.ledger.javaapi.data.*;
import com.daml.ledger.javaapi.data.codegen.HasCommands;
import com.daml.ledger.rxjava.LedgerClient;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.holding.fungible.Fungible;
import org.reactivestreams.Subscriber;
import org.reactivestreams.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import synfini.mint.AllocateBurnSupplyUtil;
import synfini.mint.BurnInstruction;
import synfini.mint.MintInstruction;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class MintRequestSubscriber implements Subscriber<Event> {
  private static final Logger logger = LoggerFactory.getLogger(MintRequestSubscriber.class);

  private final LedgerClient ledgerClient;
  private final String appId;
  private final String minterBurner;
  private final String readAs;
  private Subscription subscription;
  private final Set<String> holdings;

  public MintRequestSubscriber(
    LedgerClient ledgerClient, String appId, String minterBurner, String readAs
  ) {
    this.ledgerClient = ledgerClient;
    this.appId = appId;
    this.minterBurner = minterBurner;
    this.readAs = readAs;
    this.holdings = new HashSet<>();
  }

  @Override
  public void onSubscribe(Subscription s) {
    this.subscription = s;
    s.request(1);
  }

  @Override
  public void onNext(Event event) {
    logger.info("Processing event with template ID: " + event.getTemplateId());
    if (event instanceof CreatedEvent) {
      final var createdEvent = (CreatedEvent) event;
      if (createdEvent.getTemplateId().equals(MintInstruction.TEMPLATE_ID)) {
        processMintInstruction(
          new MintInstruction.ContractId(createdEvent.getContractId()),
          MintInstruction.valueDecoder().decode(createdEvent.getArguments())
        );
      } if (createdEvent.getTemplateId().equals(BurnInstruction.TEMPLATE_ID)) {
        processBurnInstruction(
          new BurnInstruction.ContractId(createdEvent.getContractId()),
          BurnInstruction.valueDecoder().decode(createdEvent.getArguments())
        );
      } else {
        final var holdingValue = createdEvent.getInterfaceViews().get(Base.TEMPLATE_ID);
        if (holdingValue != null) {
          logger.info("Found a holding!");
          final var holding = Base.INTERFACE.valueDecoder.decode(holdingValue);
          if (holding.account.owner.equals(minterBurner) && holding.lock.isEmpty()) {
            holdings.add(createdEvent.getContractId());
          }
        }
      }
    } else if (event instanceof ArchivedEvent) {
      holdings.remove(event.getContractId());
    }

    logger.info("size of holdings " + holdings.size());

    subscription.request(1);
  }

  private void processBurnInstruction(BurnInstruction.ContractId cid, BurnInstruction burnInstruction) {
    if (!burnInstruction.isAllocated) {
      allocateForBurning(cid);
    }
  }

  private void processMintInstruction(MintInstruction.ContractId cid, MintInstruction mintInstruction) {
    if (mintInstruction.requestors.map.containsKey(minterBurner)) {
      logger.info("Accepting mint request");
      acceptRequest(cid);
    } else {
      logger.info("Not requested by the minter/burner. Rejecting the request as this feature is not supported");
      rejectRequest(cid);
    }
  }

  private void allocateForBurning(BurnInstruction.ContractId burnInstructionCid) {
    final var holdingCids = holdings.stream().map(Fungible.ContractId::new).collect(Collectors.toList());
    final var command = new AllocateBurnSupplyUtil(minterBurner)
      .createAnd()
      .exerciseMergeSplitAndAllocate(burnInstructionCid, holdingCids);
    ledgerClient.getCommandClient().submitAndWait(commandsSubmission(List.of(command))).blockingGet();
  }

  @Override
  public void onError(Throwable t) {
    logger.info("Subscription failed", t);
  }

  @Override
  public void onComplete() {
    // Given the application does not provide an end offset, this method should never be called (i.e. subscription
    // never ends)
    logger.warn("Subscription completed");
  }

  private void acceptRequest(MintInstruction.ContractId mintInstructionCid) {
    ledgerClient
      .getCommandClient()
      .submitAndWait(
        commandsSubmission(List.of(mintInstructionCid.exerciseExecuteMint()))
      ).blockingGet();
  }

  private void rejectRequest(MintInstruction.ContractId mintInstructionCid) {
    ledgerClient
      .getCommandClient()
      .submitAndWait(
        commandsSubmission(List.of(mintInstructionCid.exerciseRejectMint()))
      ).blockingGet();
  }

  private CommandsSubmission commandsSubmission(List<? extends HasCommands> commands) {
    return CommandsSubmission.create(
      appId,
      UUID.randomUUID().toString(),
      commands
    ).withActAs(minterBurner).withReadAs(List.of(readAs));
  }

  private da.set.types.Set<String> damlSet(String... element) {
    return new da.set.types.Set<>(
      Arrays.stream(element).collect(Collectors.toMap(Function.identity(), s -> Unit.getInstance()))
    );
  }
}
