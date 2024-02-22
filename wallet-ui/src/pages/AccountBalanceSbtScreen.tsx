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
import {Instrument as PartyBoundAttributes}  from "@daml.js/daml-pbt/lib/Synfini/Interface/Instrument/PartyBoundAttributes/Instrument";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";

const AccountBalanceSbtScreen: React.FC = () => {
  const { isLoading } = useAuth0();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';

  const [balances, setBalances] = useState<Balance[]>([]);
  const [instruments, setInstruments] = useState<InstrumentSummary[]>();
  const [partyBoundAttributes, setPartyBoundAttributes] = useState<PartyBoundAttributes[]>();

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

  const fetchPartiesSharedWith = async (instruments: any[]) => {
    let arr_partiesShared: any[] = [];
    for (let index = 0; index < instruments.length; index++) {
      const instrument = instruments[index];
      const partiesShared = await ledger.fetch(PartyBoundAttributes, instrument.cid );
      arr_partiesShared.push(partiesShared)
    }
    return arr_partiesShared;
  }
  
  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchBalances()
  }, [ctx.primaryParty, state]);

  useEffect(() => {
    fetchInstruments(balances)
      .then(res_instruments => {
        setInstruments(res_instruments)
        fetchPartiesSharedWith(res_instruments)
        .then(res_partiesShared => {
          setPartyBoundAttributes(res_partiesShared);
        })
    });
  },[ctx.primaryParty, balances])

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
