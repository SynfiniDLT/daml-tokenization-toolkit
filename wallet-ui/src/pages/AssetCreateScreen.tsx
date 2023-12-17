import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import AuthContextStore from "../store/AuthContextStore";
import { userContext } from "../App";
import { WalletViewsClient } from "@synfini/wallet-views";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { PageLoader } from "../components/layout/page-loader";
import CreateAssetButton from "../components/layout/createAssetButton";

const AssetCreateScreen: React.FC = () => {
  //const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}`;
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();
  const walletMode = process.env.REACT_APP_MODE || "";

  const [isLoading, setIsLoading] = useState<boolean>(false);

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });
  const fetchData = async () => {
    
  };

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  let createButton;

  if (walletMode === 'issuer') {
    createButton = (
      <button type="button" className="button__login" style={{ width: "150px" }}>
        Create Instrument
      </button>
    );
  } else if (walletMode === 'fund') {
    createButton = (
      <button type="button" className="button__login" style={{ width: "150px" }}>
        Create Fund
      </button>
    );
  }

  return (
    <PageLayout>
      <>
        <div style={{ marginTop: "15px" }}>
          <h4 className="profile__title">Create</h4>
        </div>
        <p></p>
        <CreateAssetButton walletMode={walletMode} />
      </>
    </PageLayout>
  );
};

export default AssetCreateScreen;
