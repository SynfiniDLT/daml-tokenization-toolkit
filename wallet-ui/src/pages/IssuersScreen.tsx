import React, { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import { InstrumentSummary, IssuerSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import InstrumentsToken from "../components/layout/instrumentsToken";
import { useWalletUser, useWalletViews } from "../App";

const IssuersScreen: React.FC = () => {
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();
  const walletDepository = process.env.REACT_APP_PARTIES_ENVIRONMENTAL_TOKEN_DEPOSITORY || "";

  const [instruments, setInstruments] = useState<InstrumentSummary[]>();

  useEffect(() => {
    const fetchInstruments = async () => {
      if (primaryParty !== undefined) {
        const resp_instrument = await walletClient.getInstruments({
          depository: walletDepository, 
          issuer: primaryParty, 
          id: null, 
          version: null
        });
        setInstruments(resp_instrument.instruments);
      }
    }

    fetchInstruments();
  }, [primaryParty, walletClient, walletDepository]);

  return (
    <PageLayout>
      <>
        <div style={{ marginTop: "15px" }}>
          <h4 className="profile__title">Issuance</h4>
        </div>
        <InstrumentsToken instruments={instruments} />
      </>
    </PageLayout>
  );
};

export default IssuersScreen;
