import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore, { isDefinedPrimaryParty } from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AccountBalances, { AccountBalanceSummary } from "../components/layout/accountBalances";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";

const WalletScreen: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [accountBalances, setAccountBalances] = useState<AccountBalanceSummary[]>([]);

  const walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchAccounts = async () => {
    if (isDefinedPrimaryParty(ctx.primaryParty)) {
      const resp = await walletClient.getAccounts({ owner: ctx.primaryParty, custodian: null });
      return resp.accounts;
    } else {
      return [];
    }
  };

  const fetchBalances = async (account: AccountSummary) => {
    if (isDefinedPrimaryParty(ctx.primaryParty)) {
      const resp = await walletClient.getBalance({
        account: {
          owner: ctx.primaryParty,
          custodian: account.view.custodian,
          id: account.view.id,
        },
      });
      return resp.balances;
    }
    return [];
  };

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    const fetchAccountBalances = async () => {
      const accounts = await fetchAccounts();
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => {
          const balances = await fetchBalances(account);
          return { account, balances }
        })
      );
      setAccountBalances(accountsWithBalances);
    }
    fetchAccountBalances();
  }, [ctx.primaryParty]);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      {isAuthenticated && user !== undefined && (
        <div className="profile-grid">
          <div className="profile__header">
            <img src={user.picture} alt="Profile" className="profile__avatar" />
            <div className="profile__headline">
              <h2 className="profile__title">{user.name}</h2>
              <span className="profile__description">{user.email}</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <AccountBalances accountBalances={accountBalances} />
      </div>
    </PageLayout>
  );
};

export default WalletScreen;
