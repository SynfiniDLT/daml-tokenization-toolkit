import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import AuthContextStore from "../store/AuthContextStore";
import { userContext } from "../App";
import { WalletViewsClient } from "@synfini/wallet-views";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { wait } from "../components/Util";
import { PageLoader } from "../components/layout/page-loader";
import { AccountOpenOfferSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AccountOffers from "../components/layout/accountOffers";
import Accounts from "../components/layout/accounts";

const AccountOfferScreen: React.FC = () => {
  //const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}`;
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || "";
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [accountOffers, setAccountOffers] = useState<AccountOpenOfferSummary[]>();
  const [accounts, setAccounts] = useState<any>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState("");

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });
  const fetchAccounts = async () => {
    if (ctx.primaryParty !== "") {
      const resp = await walletClient.getAccountOpenOffers({});
      setAccountOffers(resp.accountOpenOffers);
      const respAcc = await walletClient.getAccounts({ owner: ctx.primaryParty });
      setAccounts(respAcc.accounts);
      return resp.accountOpenOffers;
    }
  };

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  console.log("accountoffer", accountOffers);
  console.log("accounts", accounts);

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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ flex: 1, marginRight: "15px" }}>
            <h4 className="profile__title">Accounts Created</h4>
            <Accounts accounts={accounts} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 className="profile__title">Account Offers</h4>
            <AccountOffers accountOffers={accountOffers} />
          </div>
        </div>
      </>
    </PageLayout>
  );
};

export default AccountOfferScreen;
