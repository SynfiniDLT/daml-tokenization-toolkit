import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import Instruments from "../components/layout/instruments";

const DirectoryScreen: React.FC = () => {
  const sbt_depository = process.env.REACT_APP_LEDGER_INSTRUMENT_DEPOSITORY;
  const sbt_issuer = process.env.REACT_APP_LEDGER_INSTRUMENT_ISSUER;
  
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}/wallet-views`;
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const { isAuthenticated, isLoading } = useAuth0();
  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [instruments, setInstruments] = useState<any[]>();

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchUserLedger = async () => {
    if (isAuthenticated && !isLoading) {
      try {
        const user = await ledger.getUser();
        if (user.primaryParty !== undefined) {
          setPrimaryParty(user.primaryParty);
          ctx.setPrimaryParty(user.primaryParty);
        } else {
        }
      } catch (err) {
        console.log("error when fetching primary party", err);
      }
    }
  };

  const fetchInstruments = async () => {
    if (primaryParty !== "" && sbt_depository!== undefined && sbt_issuer!== undefined) {
      const resp = await walletClient.getInstruments({ depository: sbt_depository +  "::" +primaryParty.split("::")[1], issuer: sbt_issuer +  "::" +primaryParty.split("::")[1], id: {unpack:"EntityName"}, version: null });
      setInstruments(resp.instruments.filter(instrument => instrument.pbaView?.owner !== primaryParty))
    }
  };

  useEffect(() => {
    fetchUserLedger();
  }, []);

  useEffect(() => {
    fetchInstruments();
  }, [primaryParty]);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <div>
            <Instruments instruments={instruments} />
      </div>
    </PageLayout>
  );
};

export default DirectoryScreen;
