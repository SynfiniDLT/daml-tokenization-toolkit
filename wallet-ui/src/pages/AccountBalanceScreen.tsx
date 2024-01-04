import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { WalletViewsClient } from "@synfini/wallet-views";
import Balances from "../components/layout/balances";

import { PageLayout } from "../components/PageLayout";
import { AccountDetailsSimple } from "../components/layout/accountDetails";
import { PageLoader } from "../components/layout/page-loader";
import {
  Balance,
  InstrumentSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import BalanceSbts from "../components/layout/balanceSbts";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";

const AccountBalanceScreen: React.FC = () => {
  const { isLoading } = useAuth0();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  //const walletViewsBaseUrl: string = `${window.location.protocol}//${window.location.host}`;
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';

  const [balances, setBalances] = useState<Balance[]>([]);
  const [instruments, setInstruments] = useState<InstrumentSummary[]>();

  let walletClient: WalletViewsClient;
  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchBalances = async () => {
    if (ctx.primaryParty !== "") {
      const resp = await walletClient.getBalance({
        account: {
          owner: ctx.primaryParty,
          custodian: state.account.view.custodian,
          id: state.account.view.id,
        },
      });
      setBalances(resp.balances);
      return resp.balances;
    }
    return [];
  };

  const fetchInstruments = async (balancesIns: Balance[]) => {

    let arr_test_instr: InstrumentSummary[] = [];
    for (let index = 0; index < balancesIns.length; index++) {
      const balance = balancesIns[index];
      const resp_instrument = await walletClient.getInstruments(balance.instrument);
      if (resp_instrument.instruments.length > 0) 
        arr_test_instr.push(resp_instrument.instruments[0]);
    }
    return arr_test_instr;
    
    
  }
  
  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchBalances()
  },[ctx.primaryParty]);

  useEffect(() => {
    fetchInstruments(balances)
    .then((res => setInstruments(res)));
  },[ctx.primaryParty])

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Account Balance
      </h3>
      <AccountDetailsSimple account={state.account}></AccountDetailsSimple>
      {state.account.view.id.unpack !== "sbt" ? (
        <Balances balances={balances}></Balances>
        ) : (
        <BalanceSbts instruments={instruments} />
      )}
    </PageLayout>
  );
};

export default AccountBalanceScreen;
