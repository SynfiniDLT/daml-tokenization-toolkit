import React, { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import InstrumentsToken from "../components/layout/instrumentsToken";
import { useWalletUser, useWalletViews } from "../App";
import { InstrumentSummary } from "@synfini/wallet-views";

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
        setInstruments(resp_instrument);
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
