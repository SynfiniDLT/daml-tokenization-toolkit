import React, { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import InstrumentsToken from "../components/layout/instrumentsToken";
import { useWalletUser, useWalletViews } from "../App";

const IssuersScreen: React.FC = () => {
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();

  const [instruments, setInstruments] = useState<InstrumentSummary[]>();

  useEffect(() => {
    const fetchInstruments = async () => {
      if (primaryParty !== undefined) {
        const resp_instrument = await walletClient.getInstruments({
          depository: null, 
          issuer: primaryParty, 
          id: null, 
          version: null
        });
        setInstruments(resp_instrument.instruments);
      }
    }

    fetchInstruments();
  }, [primaryParty, walletClient]);

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
