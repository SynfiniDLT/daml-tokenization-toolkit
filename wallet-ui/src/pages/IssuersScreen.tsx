import React, { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import Issuers from "../components/layout/issuers";
import { InstrumentSummary, IssuerSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import InstrumentsToken from "../components/layout/instrumentsToken";
import { useWalletUser, useWalletViews } from "../App";

const IssuersScreen: React.FC = () => {
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();
  const walletDepository = process.env.REACT_APP_PARTIES_ENVIRONMENTAL_TOKEN_DEPOSITORY || "";

  const [isLoading] = useState<boolean>(false);
  const [issuers, setIssuers] = useState<IssuerSummary[]>();
  const [instruments, setInstruments] = useState<InstrumentSummary[]>();

  useEffect(() => {
    const fetchIssuers = async () => {
      if (primaryParty !== undefined) {
        const resp = await walletClient.getIssuers({
          depository: walletDepository,
          issuer: primaryParty,
        });
        setIssuers(resp.issuers);
      }
    };

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

    fetchIssuers();
    fetchInstruments();
  }, [primaryParty, walletClient, walletDepository]);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <>
        <div style={{ marginTop: "15px" }}>
          <h4 className="profile__title">Issuance</h4>
        </div>
        {/* <Issuers issuers={issuers} /> */}
        <InstrumentsToken instruments={instruments} />
      </>
    </PageLayout>
  );
};

export default IssuersScreen;
