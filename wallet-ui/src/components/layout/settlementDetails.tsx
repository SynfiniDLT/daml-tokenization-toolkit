// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { arrayToMap, formatCurrency, repairMap, setToArray, toDateTimeString, truncateParty, wait } from "../../Util";
import styled from "styled-components";
import { Field, FieldPending, FieldSettled } from "./general.styled";
import CopyToClipboard from "./copyToClipboard";
import {
  AllocateAndApproveHelper,
  AllocationHelp,
  ApprovalHelp,
  HoldingDescriptor,
} from "@daml.js/synfini-settlement-helpers/lib/Synfini/Settlement/Helpers";
import { arrayToSet } from "../../Util";
import * as damlTypes from "@daml/types";
import {
  AccountKey,
  Id,
  InstrumentKey,
  Quantity,
} from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { userContext } from "../../App";
import { Base, View as BaseView } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Base";
import { Instruction } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Instruction";
import { Batch } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Batch";
import Modal from "react-modal";
import AccountsSelect from "./accountsSelect";
import { useWalletUser, useWalletViews } from "../../App";
import { maxPolls, pollDelay } from "../../Configuration";
import { Allocation, Approval, RoutedStep } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Types";
import { Set as DamlSet } from "@daml.js/da-set/lib/DA/Set/Types";
import { FirstRender } from "../../Util";
import { AccountSummary, SettlementSummary } from "@synfini/wallet-views";

function isMint(step: RoutedStep): boolean {
  return step.custodian === step.sender ||
    (step.quantity.unit.issuer === step.sender && step.quantity.unit.issuer !== step.receiver);
}

function isBurn(step: RoutedStep): boolean {
  return step.custodian === step.receiver ||
    (step.quantity.unit.issuer === step.receiver && step.quantity.unit.issuer !== step.sender);
}

function requiresIssuerAction(
  primaryParty: damlTypes.Party,
  step: RoutedStep,
  allocation: Allocation,
  approval: Approval
): boolean {
  return primaryParty === step.quantity.unit.issuer &&
    (
      (isMint(step) && allocation.tag === "Unallocated") ||
      (isBurn(step) && approval.tag === "Unapproved")
    );
}

interface SettlementDetailsProps {
  settlement: SettlementSummary;
}

export default function SettlementDetails(props: SettlementDetailsProps) {
  const nav = useNavigate();
  const location = useLocation();
  const [isActionRequired, setIsActionRequired] = useState<boolean>(false);

  // TODO this should be refactored into a common utility
  const handleInstrumentModal = (instrument: InstrumentKey) => {
    nav("/asset", { state: { instrument } });
  }

  const handleSeeDetails = (settlement: SettlementSummary) => {
    nav("/settlement/action", { state: { settlement: settlement } });
  };

  const SettlementDetailsContainer = styled.div`
    border-radius: 12px;
    margin: 15px;
    padding: 10px;
    background-color: #2a2b2f;
    box-shadow: 6.8px 13.6px 13.6px hsl(0deg 0% 0% / 0.29);
  `;

  useEffect(() => {
    const { hash } = location;
    if (hash) {
      const targetElement = document.getElementById(hash.slice(1));
      if (targetElement) {
        const offset = -100;
        const topPosition = targetElement.offsetTop + offset;
        window.scrollTo({
          top: topPosition,
          behavior: "smooth",
        });
      }
    }

    if (props.settlement.execution === null) {
      setIsActionRequired(true);
    }
  }, [location, props.settlement.execution]);

  return (
    <SettlementDetailsContainer>
      <div key={props.settlement.batchCid} id={props.settlement.batchId.unpack}>
        <div>
          <div>
            <Field>Transaction ID:</Field>
            <CopyToClipboard
              paramToCopy={props.settlement.batchId.unpack}
              paramToShow={props.settlement.batchId.unpack}
            />
            <br />
          </div>
          <Field>Description:</Field>
            <span style={{whiteSpace: "pre-wrap"}}>{props.settlement.description}</span>
          <br />
          <Field>Transaction Status:</Field>
          {
            props.settlement.execution === null ? 
              <FieldPending>Pending</FieldPending>
           :
              <FieldSettled>Settled</FieldSettled>
          }
          <br />
          <Field>Created Time:</Field>
          {toDateTimeString(props.settlement.witness.effectiveTime)}
          <br />
          {
            props.settlement.execution !== null && <Field>Settled Time:</Field>
          }
          {props.settlement.execution !== null && toDateTimeString(props.settlement.execution.effectiveTime)}
        </div>

        <hr></hr>
        {
          props.settlement.steps.map(step =>
            <div key={step.instructionId.unpack}>
              <h5 className="profile__title">Instruction</h5>
              <div style={{ margin: "15px" }}>
                <Field>ID:</Field>
                {step.instructionId.unpack}
                <br />
                <Field>Type: </Field>
                {
                  isMint(step.routedStep) ? <> Issuance<br/></> :
                  isBurn(step.routedStep) ? <> Redemption<br/></> : <> Transfer<br/></>
                }
                <Field>Amount: </Field>
                  {formatCurrency(step.routedStep.quantity.amount)}
                <br />
                <div id={step.routedStep.quantity.unit.id.unpack} key={step.instructionCid}>
                  <Field>Asset:</Field>
                    <a onClick={() => handleInstrumentModal(step.routedStep.quantity.unit)}>
                      {`${step.routedStep.quantity.unit.id.unpack} ${step.routedStep.quantity.unit.version}`}
                    </a>
                  <br />
                  {
                    !isMint(step.routedStep) &&
                    <>
                      <Field>Sender: </Field>
                      {truncateParty(step.routedStep.sender)}
                      <br />
                    </>
                  }

                  {
                    !isBurn(step.routedStep) &&
                    <>
                      <Field>Receiver: </Field>
                      {truncateParty(step.routedStep.receiver)}
                      <br />
                    </>
                  }

                  <Field>Register: </Field>
                  {truncateParty(step.routedStep.custodian)}
                  <br />
                </div>
                <hr></hr>
              </div>
            </div>
          )
        }
        {isActionRequired && <button onClick={() => handleSeeDetails(props.settlement)}>Action Required</button>}
      </div>
    </SettlementDetailsContainer>
  );
}

export type SettlementDetailsActionProps = {
  requestors: DamlSet<damlTypes.Party>;
  batchId: Id;
};

export function SettlementDetailsAction(props: SettlementDetailsActionProps) {
  repairMap(props.requestors.map);
  const nav = useNavigate();
  const location = useLocation();
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();
  const ledger = userContext.useLedger();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  // Map from custodian to accounts at that custodian
  const [accounts, setAccounts] = useState<damlTypes.Map<damlTypes.Party, AccountSummary[]>>(damlTypes.emptyMap());
  const [selectSendAccountInput, setSelectSendAccountInput] = useState<damlTypes.Map<Id, Id>>(damlTypes.emptyMap());
  const [selectRecieveAccountInput, setSelectReceiveAccountInput] = useState<damlTypes.Map<Id, Id>>(damlTypes.emptyMap());
  // Instructions which the user has selected they want to create holdings for
  const [mintInput, setMintInput] = useState(arrayToSet<Id>([]));
  // Instructions which the user has selected they want to remove holdings for
  const [burnInput, setBurnInput] = useState(arrayToSet<Id>([]));
  const [showExecute, setShowExecute] = useState<boolean>(false);
  const [hasExecuted, setHasExecuted] = useState<boolean>(false);

  const [settlement, setSettlement] = useState<SettlementSummary>();
  console.log('settlement details', settlement);
  const [settlementHoldings, setSettlementHoldings] =
    useState<damlTypes.Map<damlTypes.ContractId<Base>, BaseView>>(damlTypes.emptyMap());

  // Map from the instruction ID to the contract ID of the instruction prior to exercising a choice on it
  const [dirtyInstructions, setDirtyInstructions] = useState<
    damlTypes.Map<Id, damlTypes.ContractId<Instruction>> | undefined | FirstRender
  >("FirstRender");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const fetchSettlement = async () => {
      if (dirtyInstructions === undefined) {
        return;
      }

      if (refresh >= maxPolls) {
        console.log("Max polls limit reached");
        setDirtyInstructions(undefined);
        return;
      }

      if (dirtyInstructions !== "FirstRender") {
        await wait(pollDelay);
      }

      const settlements = await walletClient.getSettlements(
        {
          batchId: {
            unpack: props.batchId.unpack
          },
          before: null,
          limit: null
        }
      );
      const filteredSettlements = settlements
        .filter(s =>
          s.requestors.map.entriesArray().length === props.requestors.map.entriesArray().length &&
          setToArray(s.requestors).every(r => props.requestors.map.has(r))
        );

      if (filteredSettlements.length !== 1) {
        console.warn("Settlement not found");
        setRefresh(0);
        setDirtyInstructions(undefined);
        return;
      }

      const foundSettlement = filteredSettlements[0];

      for (const step of foundSettlement.steps) {
        if (step.allocation.tag === "Pledge" && !settlementHoldings.has(step.allocation.value)) {
          const holding = await ledger.fetch(Base, step.allocation.value);
          if (holding !== null) {
            setSettlementHoldings(
              holds => holds.set(step.allocation.value as damlTypes.ContractId<Base>, holding.payload)
            );
          }
        }
      }

      if (dirtyInstructions === "FirstRender") {
        setRefresh(0);
        setDirtyInstructions(undefined);
        setSettlement(foundSettlement);
        return;
      }

      for (const step of foundSettlement.steps) {
        const dirtyCid = dirtyInstructions.get(step.instructionId);
        if (dirtyCid !== undefined && step.instructionCid === dirtyCid) {
          setRefresh(r => r + 1);
          return;
        }
      }

      setRefresh(0);
      setDirtyInstructions(undefined);
      setSettlement(foundSettlement);
    }

    fetchSettlement();
  }, [walletClient, ledger, props.requestors, props.batchId.unpack, dirtyInstructions, settlementHoldings, refresh]);

  const handleInstrumentClick = (instrument: InstrumentKey) => {
    nav("/asset", { state: { instrument } });
  }

  const handleCloseModal = (path: string) => {
    setIsModalOpen(!isModalOpen);
    if (hasExecuted) {
      nav("/" + path);
    }
  };

  const handleAccountChange = (send: boolean, instructionId: Id, event: ChangeEvent<HTMLSelectElement>) => {
    console.log('event.target.value', event.target.value);
    (send ? setSelectSendAccountInput : setSelectReceiveAccountInput)(accounts =>
      accounts.set(instructionId, { unpack: event.target.value })
    );
  };

  const handleToggleInstruction = (mint: boolean, instructionId: Id) => {
    (mint ? setMintInput : setBurnInput)(set =>
      set.map.has(instructionId) ? { map: set.map.delete(instructionId) } : { map: set.map.set(instructionId, {}) }
    );
  }

  const SettlementDetailsContainer = styled.div`
    margin: 5px;
    padding: 10px;
  `;

  function acceptanceActions(settlement: SettlementSummary): {
    allocations: damlTypes.Map<Id, AllocationHelp>;
    approvals: damlTypes.Map<Id, ApprovalHelp>;
    pledgeDescriptors: HoldingDescriptor[];
  } {
    // Map from the account and quantity used to the list of instruction IDs which match this criteria
    let accountQuantitiesMap: damlTypes.Map<
      { account: AccountKey; quantity: Quantity<InstrumentKey, string> },
      Id[]
    > = damlTypes.emptyMap();
    settlement.steps.forEach((step) => {
      const accountId = selectRecieveAccountInput.get(step.instructionId);
      if (step.routedStep.receiver === primaryParty && accountId !== undefined) {
        const account = {
          custodian: step.routedStep.custodian,
          owner: primaryParty,
          id: accountId
        };
        const k = { account, quantity: step.routedStep.quantity };
        const ids = accountQuantitiesMap.get(k) || [];
        ids.push(step.instructionId);
        accountQuantitiesMap = accountQuantitiesMap.set(k, ids);
      }
    });
    let allocations: damlTypes.Map<Id, AllocationHelp> = damlTypes.emptyMap();
    let approvals: damlTypes.Map<Id, ApprovalHelp> = damlTypes.emptyMap();
    const pledgeDescriptors: HoldingDescriptor[] = [];

    // Update allocations
    settlement.steps.forEach((step) => {
      const accountId = selectSendAccountInput.get(step.instructionId);

      if (step.routedStep.sender === primaryParty) {
        const account =
          accountId !== undefined ?
            { custodian: step.routedStep.custodian, owner: primaryParty, id: accountId }
          :
            undefined
        const availablePassThroughFroms =
          account !== undefined ?
            (accountQuantitiesMap.get({ account, quantity: step.routedStep.quantity }) || [])
          :
            [];
        if (account !== undefined) {
          if (availablePassThroughFroms.length > 0) {
            const passThroughFromId = availablePassThroughFroms.pop();
            if (passThroughFromId === undefined) {
              throw Error("Internal error");
            }
            allocations = allocations.set(step.instructionId, {
              tag: "PassThroughFromHelp",
              value: { accountId: account.id, instructionId: passThroughFromId },
            });
            approvals = approvals.set(passThroughFromId, {
              tag: "PassThroughToHelp",
              value: { accountId: account.id, instructionId: step.instructionId },
            });
          } else {
            allocations = allocations.set(
              step.instructionId,
              { tag: "PledgeFromFungiblesHelp", value: { accountId: account.id } }
            );
            const holdingDescriptor = {
              account,
              instrument: step.routedStep.quantity.unit,
            };
            pledgeDescriptors.push(holdingDescriptor);
          }
        }
      } else if (mintInput.map.has(step.instructionId)) {
        // This is a "mint" instruction to be approved by the issuer
        allocations = allocations.set(step.instructionId, { tag: "AllocateMintHelp", value: {} });
      }
    });

    // Update approvals
    settlement.steps
      .filter((step) => !approvals.has(step.instructionId))
      .forEach((step) => {
        if (step.routedStep.receiver === primaryParty) {
          const accountId = selectRecieveAccountInput.get(step.instructionId);
          if (accountId !== undefined) {
            approvals = approvals.set(step.instructionId, { tag: "TakeDeliveryHelp", value: { accountId } });
          }
        } else if (burnInput.map.has(step.instructionId)) {
          // This is a "burn" instruction to be approved by the issuer
          approvals = approvals.set(step.instructionId, { tag: "ApproveBurnHelp", value: {} });
        }
      });

    return {
      allocations,
      approvals,
      pledgeDescriptors,
    };
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    if (primaryParty === undefined) {
      setError("Error primary party not set");
      setIsModalOpen(!isModalOpen);
      return;
    }
    if (settlement === undefined) {
      setError("Error loading page data");
      setIsModalOpen(!isModalOpen);
      return;
    }

    const { allocations, approvals, pledgeDescriptors } = acceptanceActions(settlement);
    const instructionIdsToModify = allocations
      .entriesArray()
      .map(([instructionId, _]) => instructionId)
      .concat(approvals.entriesArray().map(([instructionId, _]) => instructionId));
    const dirties = arrayToMap(
      instructionIdsToModify
        .flatMap(
          instructionId => {
            const instructionCid = settlement
              .steps
              .find(s => s.instructionId.unpack === instructionId.unpack)
              ?.instructionCid;
            let kv: [Id, damlTypes.ContractId<Instruction>][] = []
            if (instructionCid !== undefined) {
              kv = [[instructionId, instructionCid]];
            } else {
              console.warn(`Unable to locate instruction ID: ${instructionId.unpack}`);
            }
            return kv;
          }
        )
    );
    setDirtyInstructions(dirties);
    let holdings: damlTypes.Map<HoldingDescriptor, damlTypes.ContractId<Base>[]> = damlTypes.emptyMap();

    for (const holdingDescriptor of pledgeDescriptors) {
      if (!holdings.has(holdingDescriptor)) {
        const activeHoldings = await walletClient.getHoldings({
          account: holdingDescriptor.account,
          instrument: holdingDescriptor.instrument
        });
        holdings = holdings.set(
          holdingDescriptor,
          activeHoldings.filter((h) => h.view.lock === null).map((h) => h.cid)
        );
      }
    }

    const instructions: damlTypes.Map<Id, damlTypes.ContractId<Instruction>> = arrayToMap(
      settlement.steps.map(step => [step.instructionId, step.instructionCid])
    );

    await ledger
      .createAndExercise(
        AllocateAndApproveHelper.AllocateAndApprove,
        {
          actors: arrayToSet([primaryParty]),
          instructions,
          holdings,
          allocations,
          approvals,
        },
        {}
      )
      .then(() => {
        setMessage("Settlement preferences applied successfully");
        setIsModalOpen(!isModalOpen);
      })
      .catch((err) => {
        setError("Sorry, there was an error applying your preferences");
        console.error("Unable to allocate and approve settlement", err)
        setIsModalOpen(!isModalOpen);
        setDirtyInstructions(undefined);
      });
  };

  const handleExecute = async () => {
    if (settlement === undefined) {
      setError("Failed to load page data");
      setIsModalOpen(!isModalOpen);
      return;
    }

    if (settlement.batchCid === null) {
      setError("Internal error");
      setIsModalOpen(!isModalOpen);
      return;
    }

    if (primaryParty === undefined) {
      setError("Error primary party not set");
      setIsModalOpen(!isModalOpen);
      return;
    }

    await ledger
      .exercise(
        Batch.Settle,
        settlement.batchCid,
        {
          actors: arrayToSet([primaryParty]),
        }
      )
      .then(() => {
        setMessage("Settlement executed successfully");
        setIsModalOpen(!isModalOpen);
        setHasExecuted(true);
      })
      .catch((err) => {
        setError("Sorry that didn't work");
        console.error("Error executing settlement", err);
        setIsModalOpen(!isModalOpen);
      });
  };

  useEffect(() => {
    const { hash } = location;
    if (hash) {
      const targetElement = document.getElementById(hash.slice(1));
      if (targetElement) {
        const offset = -100;
        const topPosition = targetElement.offsetTop + offset;
        window.scrollTo({
          top: topPosition,
          behavior: "smooth",
        });
      }
    }
  }, [location]);

  useEffect(() => {
    if (primaryParty === undefined || settlement === undefined) {
      return
    }

    const fetchAccounts = async (custodian: damlTypes.Party) => {
      const respAcc = await walletClient.getAccounts({ owner: primaryParty, custodian, id: null });
      setAccounts(accounts => accounts.set(custodian, respAcc));
    };

    // STEPS LOOP THROUGH
    let stepNotReady = false;
    settlement.steps.forEach(step => {
      // CHECK STEPS APPROVAL / ALLOCATION
      if (
        !accounts.has(step.routedStep.custodian) && (
          step.routedStep.sender === primaryParty ||
          step.routedStep.receiver === primaryParty ||
          (
            (isMint(step.routedStep) || isBurn(step.routedStep)) &&
            step.routedStep.quantity.unit.issuer === primaryParty
          )
        )
      ) {
        fetchAccounts(step.routedStep.custodian);
      }

      // CHECK IF CAN EXECUTE
      if (step.approval.tag === "Unapproved" || step.allocation.tag === "Unallocated") {
        stepNotReady = true;
      }
    });

    if (!stepNotReady && settlement.settlers.map.has(primaryParty)) {
      setShowExecute(true);
    }
  }, [primaryParty, walletClient, settlement, accounts]);

  if (settlement === undefined) {
    return <></>;
  }

  return (
    <SettlementDetailsContainer>
      <form onSubmit={handleSubmit}>
        <div key={settlement.batchId.unpack} id={settlement.batchId.unpack}>
          <div>
            <div>
              <Field>Transaction ID:</Field>
              <CopyToClipboard
                paramToCopy={settlement.batchId.unpack}
                paramToShow={settlement.batchId.unpack}
              />
              <br />
            </div>
            <Field>Description:</Field>
            {settlement.description}
            <br />
            <Field>Transaction Status:</Field>
            {
              settlement.execution === null ?
                <FieldPending>Pending</FieldPending>
             :
                <FieldSettled>Settled</FieldSettled>
            }
            <br />
            <Field>Authorised Settlers:</Field>
            {setToArray(settlement.settlers).map(truncateParty).join(", ")}
            <br />
            <Field>Created Time:</Field>
            {toDateTimeString(settlement.witness.effectiveTime)}
            <br />
            {settlement.execution !== null && <Field>Settled Time:</Field>}
            {settlement.execution !== null && toDateTimeString(settlement.execution.effectiveTime)}
            {settlement.execution !== null && <> | Offset: </>}
            {settlement.execution !== null && settlement.execution.offset}
          </div>

          <hr></hr>
          {
            primaryParty !== undefined &&
            settlement.steps.map(step =>
              <div key={step.instructionId.unpack}>
                <h5 className="profile__title">Instruction</h5>
                <div style={{ margin: "15px" }}>
                  <Field>ID:</Field>
                  {step.instructionId.unpack}
                  <br />
                  <div
                    style={{
                      ...(requiresIssuerAction(primaryParty, step.routedStep, step.allocation, step.approval)
                        ? { border: "1px solid", width: "fit-content" }
                        : {}),
                    }}
                  >
                    <Field>Type: </Field>
                    {
                      isMint(step.routedStep) ?
                        <> Issuance<br/></>
                      : isBurn(step.routedStep) ?
                        <> Redemption<br/></>
                      :
                        <> Transfer<br/></>
                    }
                  </div>
                  <Field>Amount: </Field>
                  {formatCurrency(step.routedStep.quantity.amount)}
                  <br />
                  <div id={step.routedStep.quantity.unit.id.unpack} key={step.instructionCid}>
                    <Field>Asset:</Field>
                    <a onClick={() => handleInstrumentClick(step.routedStep.quantity.unit)}>
                      {`${step.routedStep.quantity.unit.id.unpack} ${step.routedStep.quantity.unit.version}`}
                    </a>
                    <br />
                    {
                      !isMint(step.routedStep) &&
                      <div
                        style={{
                          ...(step.routedStep.sender === primaryParty && step.allocation.tag === "Unallocated"
                            ? { border: "1px solid", width: "fit-content" }
                            : {}),
                        }}
                      >
                        <Field>Sender: </Field>
                        <span
                          style={{
                            fontWeight: step.routedStep.sender === primaryParty ? "bold" : "normal",
                          }}
                        >
                          {truncateParty(step.routedStep.sender)}
                        </span>
                      </div>
                    }
                    <div
                      style={{
                        ...(step.routedStep.receiver === primaryParty && step.approval.tag === "Unapproved" ?
                          { border: "1px solid", width: "fit-content" } : {}),
                      }}
                    >
                      <Field>Receiver: </Field>
                      <span
                        style={{
                          fontWeight: step.routedStep.receiver === primaryParty ? "bold" : "normal",
                        }}
                      >
                        {truncateParty(step.routedStep.receiver)}
                      </span>
                    </div>
                    <Field>Register: </Field>
                    {truncateParty(step.routedStep.custodian)}
                    <br />
                    <Field>{isMint(step.routedStep) ? "Issuer response:" : "Sender response:"}</Field>
                    {
                      step.allocation.tag === "Unallocated" ?
                        <span style={{ color: "hsl(0, 90%, 80%)" }}>Pending</span>
                      : step.allocation.tag === "Pledge" ?
                        `Send from account ${settlementHoldings.get(step.allocation.value)?.account.id.unpack}`
                      : step.allocation.tag === "PassThroughFrom" ?
                        `Pass through from instruction ${step.allocation.value._2.id.unpack}`
                      : step.allocation.tag === "CreditReceiver" ?
                        "Credit approved"
                      : step.allocation.tag === "SettleOffledger" ?
                        "Settle off-ledger"
                      :
                        "Allocated"
                    }
                    <br />
                    <Field>{isBurn(step.routedStep) && step.routedStep.sender !== step.routedStep.custodian ? "Issuer response:" : "Receiver response:"}</Field>
                    {
                      step.approval.tag === "Unapproved" ?
                        <span style={{ color: "hsl(0, 90%, 80%)" }}>Pending</span>
                      : step.approval.tag === "TakeDelivery" ?
                        `Take delivery to account ${step.approval.value.id.unpack}`
                      : step.approval.tag === "PassThroughTo" ?
                        `Pass through to instruction ${step.approval.value._2.id.unpack} via account ${step.approval.value._1.id.unpack}`
                      : step.approval.tag === "DebitSender" ?
                        "Debit approved"
                      : step.approval.tag === "SettleOffledgerAcknowledge" ?
                        "Settle off-ledger"
                      :
                        "Approved"
                    }
                    <br />
                  </div>

                  {
                    (
                      step.routedStep.sender === primaryParty ||
                      (isMint(step.routedStep) && step.routedStep.quantity.unit.issuer === primaryParty)
                    ) &&
                    <div style={{ display: "flex", alignItems: "center", marginTop: "5px" }}>
                      <div style={{ padding: "10px" }}>Send from:</div>
                      <div>
                        <AccountsSelect
                          accounts={accounts.get(step.routedStep.custodian)}
                          instrument={step.routedStep.quantity.unit}
                          onChange={event => handleAccountChange(true, step.instructionId, event)}
                          selectedAccount={selectSendAccountInput.get(step.instructionId)?.unpack || ""}
                          disabled={mintInput.map.has(step.instructionId)}
                        />
                      </div>
                    </div>
                  }

                  {
                    (
                      step.routedStep.receiver === primaryParty ||
                      (isBurn(step.routedStep) && step.routedStep.quantity.unit.issuer === primaryParty)
                    ) &&
                    <div style={{ display: "flex", alignItems: "center", marginTop: "5px" }}>
                      <div style={{ padding: "10px" }}>Take delivery to:</div>
                      <div>
                        <AccountsSelect
                          accounts={accounts.get(step.routedStep.custodian)}
                          instrument={step.routedStep.quantity.unit}
                          onChange={event => handleAccountChange(false, step.instructionId, event)}
                          selectedAccount={selectRecieveAccountInput.get(step.instructionId)?.unpack || ""}
                          disabled={burnInput.map.has(step.instructionId)}
                        />
                      </div>
                    </div>
                  }

                  {
                    (
                      step.routedStep.sender === step.routedStep.custodian &&
                      step.routedStep.quantity.unit.issuer === primaryParty
                    ) &&
                    <div>
                      Issue new Holdings
                      <input
                        type="checkbox"
                        checked={mintInput.map.has(step.instructionId)}
                        onChange={_ => handleToggleInstruction(true, step.instructionId) }
                      />
                    </div>
                  }
                  {
                    (
                      step.routedStep.receiver === step.routedStep.custodian &&
                      step.routedStep.quantity.unit.issuer === primaryParty
                    ) &&
                    <div>
                      Remove Holdings
                      <input
                        type="checkbox"
                        checked={burnInput.map.has(step.instructionId)}
                        onChange={_ => handleToggleInstruction(false, step.instructionId)}
                      />
                    </div>
                  }
                  <hr></hr>
                </div>
              </div>
            )
          }
          <br></br>
          <button type="submit" className="button__login" style={{ width: "180px" }}>
            Apply
          </button>
          {
            showExecute &&
            <button type="button" className="button__login" style={{ width: "150px" }} onClick={() => handleExecute()}>
              Execute
            </button>
          }
        </div>
      </form>
      <Modal
        id="handleCloseMessageModal"
        className="MessageModal"
        isOpen={isModalOpen}
        onRequestClose={() => handleCloseModal}
        contentLabel="Settlement Modal"
      >
        <>
          <div>
            {
              message !== "" ?
                <span style={{ color: "#66FF99", fontSize: "1.5rem", whiteSpace: "pre-line" }}>{message}</span>
             :
                <span style={{ color: "#FF6699", fontSize: "1.5rem", whiteSpace: "pre-line" }}>{error}</span>
            }
          </div>
          <p></p>
          <div className="containerButton">
            <div>
              <button
                type="button"
                className="button__login"
                style={{ width: "150px" }}
                onClick={() => handleCloseModal(`settlements#${settlement.batchId.unpack}`)}
              >
                OK
              </button>
            </div>
          </div>
          <p></p>
        </>
      </Modal>
    </SettlementDetailsContainer>
  );
}
