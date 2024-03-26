import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import Instruments from "../components/layout/instruments";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { useWalletUser, useWalletViews } from "../hooks/WalletViews";

const DirectoryScreen: React.FC = () => {
  const sbtDepository = process.env.REACT_APP_PARTIES_SBT_INSTRUMENT_DEPOSITORY;
  const sbtIssuer = process.env.REACT_APP_PARTIES_SBT_INSTRUMENT_ISSUER;

  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();

  const { isLoading } = useAuth0();
  const [instruments, setInstruments] = useState<InstrumentSummary[]>();

  useEffect(() => {
    const fetchInstruments = async () => {
      if (primaryParty !== undefined && sbtDepository!== undefined && sbtIssuer!== undefined) {
        const resp = await walletClient.getInstruments(
          {
            depository: sbtDepository, 
            issuer: sbtIssuer, 
            id: { unpack:"EntityName" },
            version: null
          }
        );
        setInstruments(resp.instruments.filter(instrument => instrument.pbaView?.owner !== primaryParty));
      }
    };
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
