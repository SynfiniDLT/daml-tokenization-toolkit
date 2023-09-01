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
import java.util.function.Function;
import java.util.stream.Collectors;

public class MintRequestSubscriber {
  private static final Logger logger = LoggerFactory.getLogger(MintRequestSubscriber.class);

  private final LedgerClient ledgerClient;
  private final String appId;
  private final String minterBurner;
  private final String readAs;
  private final Set<String> holdings;
  private final List<CreatedEvent> instructionsAwaitingProcessing;
  private Optional<String> acsOffset;

  public MintRequestSubscriber(
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
            // Otherwise, when allocating the holdings for burning, then they may be from the wrong account/
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
            processMintInstruction(
              new MintInstruction.ContractId(createdEvent.getContractId()),
              MintInstruction.valueDecoder().decode(createdEvent.getArguments())
            );
          } else if (createdEvent.getTemplateId().equals(BurnInstruction.TEMPLATE_ID)) {
            processBurnInstruction(
              new BurnInstruction.ContractId(createdEvent.getContractId()),
              BurnInstruction.valueDecoder().decode(createdEvent.getArguments())
            );
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

  private void processBurnInstruction(BurnInstruction.ContractId cid, BurnInstruction burnInstruction) {
    if (!burnInstruction.isAllocated) {
      logger.info("Allocating to burn instruction");
      allocateForBurning(cid);
    } else {
      logger.info("Executing burn instruction (not implemented yet)");
      executeBurn(cid);
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
    final var rejectResult = ledgerClient
      .getCommandClient()
      .submitAndWaitForResult(
        updateSubmission(cid.exerciseRejectBurn())
      )
      .blockingGet();
    // TODO use result?
  }

  private void processMintInstruction(MintInstruction.ContractId cid, MintInstruction mintInstruction) {
    if (mintInstruction.requestors.map.containsKey(minterBurner)) {
      logger.info("Accepting mint request");
      executeMint(cid);
    } else {
      logger.info("Not requested by the minter/burner. Rejecting the request as this feature is not supported");
      rejectMint(cid);
    }
  }

  private void allocateForBurning(BurnInstruction.ContractId burnInstructionCid) {
    final var holdingCids = holdings.stream().map(Fungible.ContractId::new).collect(Collectors.toList());
    final var command = new AllocateBurnSupplyHelper(minterBurner)
      .createAnd()
      .exerciseAllocateBurnSupplyFromFungibles(burnInstructionCid, holdingCids);
    final var allocateResult = ledgerClient.getCommandClient().submitAndWaitForResult(updateSubmission(command)).blockingGet();
    holdings.clear();
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

  private da.set.types.Set<String> damlSet(String... element) {
    return new da.set.types.Set<>(
      Arrays.stream(element).collect(Collectors.toMap(Function.identity(), s -> Unit.getInstance()))
    );
  }
}
