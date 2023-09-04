package com.synfini.mint;

import com.daml.ledger.javaapi.data.*;
import com.daml.ledger.javaapi.data.codegen.HasCommands;
import com.daml.ledger.javaapi.data.codegen.Update;
import com.daml.ledger.rxjava.LedgerClient;
import daml.finance.interface$.holding.base.Base;
import daml.finance.interface$.holding.fungible.Fungible;
import io.reactivex.Flowable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import synfini.mint.AllocateBurnSupplyHelper;
import synfini.mint.BurnInstruction;
import synfini.mint.MintInstruction;

import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

public class MinterBurnerBot {
  private static final Logger logger = LoggerFactory.getLogger(MinterBurnerBot.class);

  private final LedgerClient ledgerClient;
  private final String appId;
  private final String minterBurner;
  private final String readAs;

  public MinterBurnerBot(LedgerClient ledgerClient, String appId, String minterBurner, String readAs) {
    this.ledgerClient = ledgerClient;
    this.appId = appId;
    this.minterBurner = minterBurner;
    this.readAs = readAs;
  }

  public void blockingExecute() {
    final Set<String> holdings = new HashSet<>();
    final var instructionsAwaitingProcessing = new ArrayList<>();

    final var instructionTemplateIds = Set.of(MintInstruction.TEMPLATE_ID, BurnInstruction.TEMPLATE_ID);
    final var holdingsAndInstructionsFilter = new FiltersByParty(
      Map.of(
        minterBurner,
        new InclusiveFilter(
          instructionTemplateIds,
          Map.of(Base.TEMPLATE_ID, Filter.Interface.INCLUDE_VIEW)
        )
      )
    );
    AtomicReference<Optional<String>> acsOffset = new AtomicReference<>(Optional.empty());
    ledgerClient
      .getActiveContractSetClient()
      .getActiveContracts(holdingsAndInstructionsFilter, false)
      .blockingForEach(getActiveContractsResponse -> {
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

        // ACS offset is present on the last response in the stream
        if (getActiveContractsResponse.getOffset().isPresent()) {
          acsOffset.set(getActiveContractsResponse.getOffset());
        }
      });

    final var streamBeginOffset = acsOffset.get().orElseThrow(() -> new IllegalStateException("ACS offset not present"));
    final var instructionsFilter = new FiltersByParty(
      Map.of(
        minterBurner,
        InclusiveFilter.ofTemplateIds(instructionTemplateIds)
      )
    );
    final var subsequentInstructions = ledgerClient
      .getTransactionsClient()
      .getTransactions(new LedgerOffset.Absolute(streamBeginOffset), instructionsFilter, false)
      .flatMap(transaction -> Flowable.fromIterable(transaction.getEvents()));
    final var allInstructions = Flowable.concat(
      Flowable.fromIterable(instructionsAwaitingProcessing),
      subsequentInstructions
    );
    allInstructions.blockingForEach(event -> {
      if (event instanceof CreatedEvent) {
        final var createdEvent = (CreatedEvent) event;
        if (createdEvent.getTemplateId().equals(MintInstruction.TEMPLATE_ID)) {
          processMintInstruction(holdings, MintInstruction.Contract.fromCreatedEvent(createdEvent));
        } else if (createdEvent.getTemplateId().equals(BurnInstruction.TEMPLATE_ID)) {
          processBurnInstruction(holdings, BurnInstruction.Contract.fromCreatedEvent(createdEvent));
        } else {
          throw new IllegalArgumentException("Unexpected template ID " + createdEvent.getTemplateId());
        }
      }
    });
  }

  private void processBurnInstruction(Set<String> holdings, BurnInstruction.Contract burnInstruction) {
    if (!burnInstruction.data.isAllocated) {
      // Allocating the holding acts as an acknowledgement that we've received the request and will process it.
      // It also reduces the available supply for burning by the requested amount.
      logger.info("Allocating to burn instruction");
      allocateForBurning(holdings, burnInstruction.id);
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

  private void processMintInstruction(Set<String> holdings, MintInstruction.Contract mintInstruction) {
    if (mintInstruction.data.requestors.map.containsKey(minterBurner)) {
      logger.info("Accepting mint request");
      executeMint(holdings, mintInstruction.id);
    } else {
      logger.info("Not requested by the minter/burner. Rejecting the request as this feature is not supported");
      rejectMint(mintInstruction.id);
    }
  }

  private void allocateForBurning(Set<String> holdings, BurnInstruction.ContractId burnInstructionCid) {
    // We use the helper contract to split/merge our holdings into the correct amount
    final var holdingCids = holdings.stream().map(Fungible.ContractId::new).collect(Collectors.toList());
    // The helper contract will be created and exercised (and archived) in one transaction
    final var command = new AllocateBurnSupplyHelper(minterBurner)
      .createAnd()
      .exerciseAllocateBurnSupplyFromFungibles(burnInstructionCid, holdingCids);
    final var allocateResult = ledgerClient
      .getCommandClient()
      .submitAndWaitForResult(updateSubmission(command)).blockingGet();
    // We've merge all our previous holdings together (making the contracts are archived), so we can clear the cache
    holdings.clear();
    // If there's any more supply left, we add it into the cache
    allocateResult
      .exerciseResult
      .remainingHoldingCid
      .ifPresent(cid -> holdings.add(cid.contractId));
  }

  private void executeMint(Set<String> holdings, MintInstruction.ContractId mintInstructionCid) {
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

  // We can use a CommandsSubmission if we don't care about the data/payload contained in the command result
  private CommandsSubmission commandsSubmission(List<? extends HasCommands> commands) {
    return CommandsSubmission.create(
      appId,
      UUID.randomUUID().toString(),
      commands
    ).withActAs(minterBurner).withReadAs(List.of(readAs));
  }

  // The UpdateSubmission can be used if we need the data/payload of the command result
  private <T> UpdateSubmission<T> updateSubmission(Update<T> update) {
    return UpdateSubmission.create(
      appId,
      UUID.randomUUID().toString(),
      update
    ).withActAs(minterBurner).withReadAs(List.of(readAs));
  }
}
