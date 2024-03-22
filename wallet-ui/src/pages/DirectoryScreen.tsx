import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import Instruments from "../components/layout/instruments";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";

const DirectoryScreen: React.FC = () => {
  const sbtDepository = process.env.REACT_APP_PARTIES_SBT_INSTRUMENT_DEPOSITORY;
  const sbtIssuer = process.env.REACT_APP_PARTIES_SBT_INSTRUMENT_ISSUER;
  
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const { isLoading } = useAuth0();
  const [instruments, setInstruments] = useState<InstrumentSummary[]>();

  const walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchInstruments = async () => {
    if (ctx.primaryParty !== "" && sbtDepository!== undefined && sbtIssuer!== undefined) {
      const resp = await walletClient.getInstruments(
        {
          depository: sbtDepository, 
          issuer: sbtIssuer, 
          id: { unpack:"EntityName" },
          version: null
        }
      );
      setInstruments(resp.instruments.filter(instrument => instrument.pbaView?.owner !== ctx.primaryParty));
    }
  };

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchInstruments();
  }, [ctx.primaryParty]);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">SBT Contents</h4>
      </div>
      <div>
            <Instruments instruments={instruments} />
      </div>
    </PageLayout>
  );
};

export default DirectoryScreen;
