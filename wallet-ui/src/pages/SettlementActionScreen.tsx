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
import { AllocateAndApproveHelper } from "@daml.js/settlement-helpers/lib/Synfini/Settlement/Helpers";
import { arrayToSet } from "../components/Util";
import { emptyMap, Map } from "@daml/types";
import * as damlTypes from "@daml/types";

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

  const handleSubmit = async (e: any) => {
    console.log("submit", selectAccountInput);
    e.preventDefault();
    // ledger.createAndExercise(AllocateAndApproveHelper.AllocateAndApprove, 
    //   {actors: arrayToSet([ctx.primaryParty]),
    //   holdings: damlTypes.emptyMap<damlTypes.Party, {}>(),
      
    //   },
    //   )
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
