import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import {
  Balance,
  InstrumentSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import BalanceSbts from "../components/layout/balanceSbts";
import { Instrument as PartyBoundAttributes }  from "@daml.js/synfini-pbt/lib/Synfini/Interface/Instrument/PartyBoundAttributes/Instrument";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import * as damlTypes from "@daml/types";
import { arrayToMap } from "../components/Util";

const AccountBalanceSbtScreen: React.FC = () => {
  const { isLoading } = useAuth0();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';

  const [balances, setBalances] = useState<Balance[]>([]);
  const [instruments, setInstruments] = useState<InstrumentSummary[]>();
  const [partyBoundAttributes, setPartyBoundAttributes] = useState<damlTypes.Map<damlTypes.ContractId<any>, damlTypes.Party[]>>();

  const walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchBalances = async () => {
    if (ctx.primaryParty !== "") {
      const resp = await walletClient.getBalance({
        account: {
          owner: ctx.primaryParty,
          custodian: state.account.view.custodian,
          id: { unpack: state.account.view.id.unpack },
        },
      });
      setBalances(resp.balances);
      return resp.balances;
    }
    return [];
  };

  const fetchInstruments = async (balancesIns: Balance[]) => {
    let arr_instruments: InstrumentSummary[] = [];
    for (let index = 0; index < balancesIns.length; index++) {
      const balance = balancesIns[index];
      const resp_instrument = await walletClient.getInstruments({
            depository: balance.instrument.depository,
            issuer: balance.instrument.issuer,
            id: { unpack: balance.instrument.id.unpack },
            version: balance.instrument.version,
      });
      if (resp_instrument.instruments.length > 0) 
        arr_instruments.push(resp_instrument.instruments[0]);
    }
    return arr_instruments;
  }

  const fetchFromLedger = async (instruments: InstrumentSummary[]) => {
    const contracts = await Promise.all(
      instruments.map(instrument => ledger.fetch(PartyBoundAttributes, instrument.cid as any))
    );
    return arrayToMap(contracts.flatMap(c => c == null ? [] : [[c.contractId, c.observers]]));
  }

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchBalances()
  }, [ctx.primaryParty, state]);

  useEffect(() => {
    const fetchInstrumentsAndObservers = async () => {
      const instruments = await fetchInstruments(balances);
      setInstruments(instruments);
      const contracts = await fetchFromLedger(instruments);
      setPartyBoundAttributes(contracts);
    };
    fetchInstrumentsAndObservers();
  }, [ctx.primaryParty, balances])

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
        SBT Details
      </h3>
      {state.account.view.id.unpack === "sbt" && (
        <BalanceSbts instruments={instruments} account={state.account} partyBoundAttributes={partyBoundAttributes} />
      )}
    </PageLayout>
  );
};

export default AccountBalanceSbtScreen;
