import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import Instruments from "../components/layout/instruments";

const InstrumentScreen: React.FC = () => {
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
    if (primaryParty !== "") {
      const resp = await walletClient.getInstruments({ depository: "", issuer: "", id: {unpack:primaryParty}, version: "1" });
      setInstruments(resp.instruments);
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

  console.log("instruments=>", instruments);

  return (
    <PageLayout>
      <div>
            <Instruments instruments={instruments} />
      </div>
    </PageLayout>
  );
};

export default InstrumentScreen;
