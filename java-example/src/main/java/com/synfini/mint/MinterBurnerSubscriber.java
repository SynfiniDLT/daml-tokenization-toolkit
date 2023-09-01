package com.synfini.mint;

import com.daml.ledger.javaapi.data.*;
import com.daml.ledger.javaapi.data.codegen.HasCommands;
import com.daml.ledger.javaapi.data.codegen.Update;
import com.daml.ledger.rxjava.LedgerClient;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.holding.fungible.Fungible;
import org.reactivestreams.Subscriber;
import org.reactivestreams.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import synfini.mint.AllocateBurnSupplyHelper;
import synfini.mint.BurnInstruction;
import synfini.mint.MintInstruction;

import java.util.*;
import java.util.stream.Collectors;

public class MinterBurnerSubscriber {
  private static final Logger logger = LoggerFactory.getLogger(MinterBurnerSubscriber.class);

  private final LedgerClient ledgerClient;
  private final String appId;
  private final String minterBurner;
  private final String readAs;
  private final Set<String> holdings;
  private final List<CreatedEvent> instructionsAwaitingProcessing;
  private Optional<String> acsOffset;

  public MinterBurnerSubscriber(
    LedgerClient ledgerClient, String appId, String minterBurner, String readAs
  ) {
    this.ledgerClient = ledgerClient;
    this.appId = appId;
    this.minterBurner = minterBurner;
    this.readAs = readAs;
    this.holdings = new HashSet<>();
    this.instructionsAwaitingProcessing = new ArrayList<>();
    this.acsOffset = Optional.empty();
  }

  public List<CreatedEvent> getInstructionsAwaitingProcessing() {
    return instructionsAwaitingProcessing;
  }

  public Optional<String> getAcsOffset() {
    return acsOffset;
  }

  public Subscriber<GetActiveContractsResponse> acsSubscriber() {
    return new Subscriber<>() {
      private Subscription subscription;

      @Override
      public void onSubscribe(Subscription s) {
        this.subscription = s;
        subscription.request(1);
      }

      @Override
      public void onNext(GetActiveContractsResponse getActiveContractsResponse) {
        for (final var createdEvent : getActiveContractsResponse.getCreatedEvents()) {
          final var holdingValue = createdEvent.getInterfaceViews().get(Base.TEMPLATE_ID);
          if (holdingValue != null) {
            logger.info("Processing holding contract");
            final var holding = Base.INTERFACE.valueDecoder.decode(holdingValue);
            // We assume the minterBurner only has one account, with only one instrument in it
            // If this is not the case, then additional conditions must be placed in the below if statement
            // Otherwise, when allocating the holdings for burning, then they may be from the wrong account/instrument
            if (holding.account.owner.equals(minterBurner) && holding.lock.isEmpty()) {
              logger.info("Adding holding to cache");
              holdings.add(createdEvent.getContractId());
            }
          } else {
            instructionsAwaitingProcessing.add(createdEvent);
          }
        }

        if (getActiveContractsResponse.getOffset().isPresent()) {
          acsOffset = getActiveContractsResponse.getOffset();
        }

        subscription.request(1);
      }

      @Override
      public void onError(Throwable t) {
        logger.error("Failure in ACS subscriber", t);
      }

      @Override
      public void onComplete() {
        logger.info("ACS subscriber has completed");
      }
    };
  }

  public Subscriber<Event> eventsSubscriber() {
    return new Subscriber<>() {
      private Subscription subscription;

      @Override
      public void onSubscribe(Subscription s) {
        this.subscription = s;
        subscription.request(1);
      }

      @Override
      public void onNext(Event event) {
        if (event instanceof CreatedEvent) {
          final var createdEvent = (CreatedEvent) event;
          if (createdEvent.getTemplateId().equals(MintInstruction.TEMPLATE_ID)) {
            processMintInstruction(MintInstruction.Contract.fromCreatedEvent(createdEvent));
          } else if (createdEvent.getTemplateId().equals(BurnInstruction.TEMPLATE_ID)) {
            processBurnInstruction(BurnInstruction.Contract.fromCreatedEvent(createdEvent));
          } else {
            throw new IllegalArgumentException("Unexpected template ID " + createdEvent.getTemplateId());
          }
        }

        subscription.request(1);
      }

      @Override
      public void onError(Throwable t) {
        logger.error("Error in events subscriber", t);
      }

      @Override
      public void onComplete() {
        logger.warn("Event subscriber completed unexpectedly");
      }
    };
  }

  private void processBurnInstruction(BurnInstruction.Contract burnInstruction) {
    if (!burnInstruction.data.isAllocated) {
      logger.info("Allocating to burn instruction");
      allocateForBurning(burnInstruction.id);
      // Or, if we want to reject the request, we could do
      // rejectBurn(burnInstruction.id)
    } else {
      logger.info("Executing burn instruction");
      executeBurn(burnInstruction.id);
    }
  }

  private void executeBurn(BurnInstruction.ContractId cid) {
    ledgerClient
      .getCommandClient()
      .submitAndWait(
        commandsSubmission(List.of(cid.exerciseExecuteBurn()))
      ).blockingGet();
  }

  private void rejectBurn(BurnInstruction.ContractId cid) {
    ledgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        updateSubmission(cid.exerciseRejectBurn())
      )
      .blockingGet();
  }

  private void processMintInstruction(MintInstruction.Contract mintInstruction) {
    if (mintInstruction.data.requestors.map.containsKey(minterBurner)) {
      logger.info("Accepting mint request");
      executeMint(mintInstruction.id);
    } else {
      logger.info("Not requested by the minter/burner. Rejecting the request as this feature is not supported");
      rejectMint(mintInstruction.id);
    }
  }

  private void allocateForBurning(BurnInstruction.ContractId burnInstructionCid) {
    // We use the helper contract to split/merge our holdings into the correct amount
    final var holdingCids = holdings.stream().map(Fungible.ContractId::new).collect(Collectors.toList());
    final var command = new AllocateBurnSupplyHelper(minterBurner)
      .createAnd()
      .exerciseAllocateBurnSupplyFromFungibles(burnInstructionCid, holdingCids);
    final var allocateResult = ledgerClient
      .getCommandClient()
      .submitAndWaitForResult(updateSubmission(command)).blockingGet();
    // We've merge all our holdings together (so the contracts are archived), so we can clear the cache
    holdings.clear();
    // If there's any more supply left, we add it into the cache
    allocateResult
      .exerciseResult
      .remainingHoldingCid
      .ifPresent(cid -> holdings.add(cid.contractId));
  }

  private void executeMint(MintInstruction.ContractId mintInstructionCid) {
    final var result = ledgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        updateSubmission(mintInstructionCid.exerciseExecuteMint())
      ).blockingGet();
    holdings.add(result.exerciseResult.supplyHoldingCid.contractId);
  }

  private void rejectMint(MintInstruction.ContractId mintInstructionCid) {
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

  private <T> UpdateSubmission<T> updateSubmission(Update<T> update) {
    return UpdateSubmission.create(
      appId,
      UUID.randomUUID().toString(),
      update
    ).withActAs(minterBurner).withReadAs(List.of(readAs));
  }
}
