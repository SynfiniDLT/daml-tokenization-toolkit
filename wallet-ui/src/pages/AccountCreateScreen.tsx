import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import AuthContextStore from "../store/AuthContextStore";
import { userContext } from "../App";
import { WalletViewsClient } from "@synfini/wallet-views";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { wait } from "../components/Util";
import { PageLoader } from "../components/layout/page-loader";

const AccountCreateScreen: React.FC = () => {
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}`;
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });
  const fetchAccounts = async () => {
  };

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchAccounts();
  }, []);

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
          <h4 className="profile__title">Accounts</h4>
        </div>
      </>
    </PageLayout>
  );
};

export default AccountCreateScreen;
