import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import { SettlementSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { useLocation } from "react-router-dom";
import SettlementDetails, { SettlementDetailsSimple } from "../components/layout/settlementDetails";
import AccountsSelect from "../components/layout/accountsSelect";
import { DivBorderRoundContainer } from "../components/layout/general.styled";
import { AllocateAndApproveHelper, AllocationHelp, ApprovalHelp, HoldingDescriptor } from "@daml.js/settlement-helpers/lib/Synfini/Settlement/Helpers";
import { arrayToSet } from "../components/Util";
import * as damlTypes from "@daml/types";
import { Id, InstrumentKey, Quantity } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { Base } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Base";
import { Instruction } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Instruction";

export const SettlementActionScreen: React.FC = () => {
  //const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}`;
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || "";
  const { state } = useLocation();
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const { isLoading } = useAuth0();
  const [accounts, setAccounts] = useState<any>();
  const [selectAccountInput, setSelectAccountInput] = useState("");

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const handleAccountChange = (event: any) => {
    setSelectAccountInput(event.target.value);
  };

  const fetchAccounts = async () => {
    if (ctx.primaryParty !== "") {
      const respAcc = await walletClient.getAccounts({ owner: ctx.primaryParty });
      setAccounts(respAcc.accounts);
    }
  };

  function acceptanceActions(
    accounts: damlTypes.Map<damlTypes.Party, Id>,
    settlement: SettlementSummary
  ): {
    allocations: damlTypes.Map<Id, AllocationHelp>,
    approvals: damlTypes.Map<Id, ApprovalHelp>,
    pledgeDescriptors: HoldingDescriptor[]
  } {
    let custodianQuantitiesMap: damlTypes.Map<
        {custodian: damlTypes.Party, quantity: Quantity<InstrumentKey, string>},
        Id[]
      > = damlTypes.emptyMap();
    settlement.steps.forEach(step => {
      if (step.routedStep.receiver == ctx.primaryParty) {
        const k = {custodian: step.routedStep.custodian, quantity: step.routedStep.quantity };
        const ids = custodianQuantitiesMap.get(k) || [];
        ids.push(step.instructionId);
        custodianQuantitiesMap = custodianQuantitiesMap.set(k, ids);
      }
    });
    let allocations: damlTypes.Map<Id, AllocationHelp> = damlTypes.emptyMap();
    let approvals: damlTypes.Map<Id, ApprovalHelp> = damlTypes.emptyMap();
    const pledgeDescriptors: HoldingDescriptor[] = [];

    // Update allocations
    settlement.steps.forEach(step => {
      if (step.routedStep.sender == ctx.primaryParty) {
        const availablePassThroughFroms = custodianQuantitiesMap.get(
          {custodian: step.routedStep.custodian, quantity: step.routedStep.quantity}
        ) || [];
        const accountId = accounts.get(step.routedStep.custodian);
        if (accountId !== undefined) {
          if (availablePassThroughFroms.length > 0) {
            const passThroughFromId = availablePassThroughFroms.pop();
            if (passThroughFromId == undefined) {
              throw Error("Internal error");
            }
            allocations = allocations
              .set(
                step.instructionId,
                { tag: 'PassThroughFromHelp', value: { accountId, instructionIndex: passThroughFromId } }
              );
            approvals = approvals
              .set(
                passThroughFromId,
                { tag: 'PassThroughToHelp', value: { accountId, instructionIndex: step.instructionId } }
              );
          } else {
            allocations = allocations
              .set(
                step.instructionId,
                { tag: 'PledgeFromFungiblesHelp', value: { }}
              );
            const holdingDescriptor = {
              custodian: step.routedStep.custodian,
              instrument: step.routedStep.quantity.unit
            };
            pledgeDescriptors.push(holdingDescriptor);
          }
        }
      } else if (
        step.routedStep.sender == step.routedStep.custodian &&
        step.routedStep.receiver == step.routedStep.quantity.unit.issuer &&
        step.routedStep.quantity.unit.issuer == ctx.primaryParty
      ) {
        // This is a "mint" instruction to be approved by the issuer
        allocations = allocations.set(step.instructionId, { tag: 'IssuerCreditHelp', value: {} });
      }
    });

    // Update approvals
    settlement
      .steps
      .filter(step => !approvals.has(step.instructionId))
      .forEach(step => {
      if (step.routedStep.receiver == ctx.primaryParty) {
        const accountId = accounts.get(step.routedStep.custodian);
        if (accountId !== undefined) {
          approvals = approvals.set(step.instructionId, { tag: 'TakeDeliveryHelp', value : accountId });
        }
      } else if (
        step.routedStep.receiver == step.routedStep.custodian &&
        step.routedStep.sender == step.routedStep.quantity.unit.issuer &&
        step.routedStep.quantity.unit.issuer == ctx.primaryParty
      ) {
        // This is a "burn" instruction to be approved by the issuer
        approvals = approvals.set(step.instructionId, { tag: 'ApproveIssuerDebitHelp', value: {} });
      }
    });

    return {
      allocations, approvals, pledgeDescriptors
    };
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    console.log("submit", selectAccountInput);
    const splitAccountInput = selectAccountInput.split("@");
    let custodianToAccount: damlTypes.Map<damlTypes.Party, Id> = emptyMap();
    custodianToAccount = custodianToAccount.set(splitAccountInput[0], { unpack: splitAccountInput[1]})

    const settlement: SettlementSummary = state.settlement;
    const { allocations, approvals, pledgeDescriptors } = acceptanceActions(custodianToAccount, settlement);
    const holdings: damlTypes.Map<HoldingDescriptor, damlTypes.ContractId<Base>[]> = damlTypes.emptyMap();

    for (const holdingDescriptor of pledgeDescriptors) {
      if (!holdings.has(holdingDescriptor)) {
        const accountId = custodianToAccount.get(holdingDescriptor.custodian);
        if (accountId !== undefined) {
          const account = {
            custodian: holdingDescriptor.custodian,
            owner: ctx.primaryParty,
            id: accountId
          };
          const activeHoldings = await walletClient.getHoldings({account, instrument: holdingDescriptor.instrument })
          holdings.set(holdingDescriptor, activeHoldings.holdings.map(h => h.cid));
        }
      }
    }

    let instructions: damlTypes.Map<Id, damlTypes.ContractId<Instruction>> = damlTypes.emptyMap();
    settlement.steps.forEach(step => instructions = instructions.set(step.instructionId, step.instructionCid));

    // const
    await ledger.createAndExercise(
      AllocateAndApproveHelper.AllocateAndApprove, 
      {
        actors: arrayToSet([ctx.primaryParty]),
        instructions,
        holdings,
        allocations,
        approvals
      },
      {}
    );
  }

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <DivBorderRoundContainer>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", alignItems: "center", marginTop: "20px" }}>
          <div style={{ padding: "10px" }}>Select An Account:</div>
          <div>
            <AccountsSelect accounts={accounts} onChange={handleAccountChange} selectedAccount={selectAccountInput} />
          </div>
        </div>
        <br />
        <br />
        <div>
          {state.settlement !== undefined && (
            <SettlementDetailsSimple
              settlement={state.settlement}
              key={state.settlement?.batchCid}
            ></SettlementDetailsSimple>
          )}
        </div>
        <br></br>
        <button type="submit" className="button__login" style={{ width: "150px" }}>
          Submit
        </button>
        <br></br><br></br>
        </form>
      </DivBorderRoundContainer>
    </PageLayout>
  );
};
