import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AccountBalances from "../components/layout/accountBalances";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";

const WalletScreen: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [accountBalancesMap, setAccountBalancesMap] = useState(new Map<any, any>());

  console.log("url backend endpoint=>",walletViewsBaseUrl)

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchAccounts = async () => {
    if (ctx.primaryParty !== "") {
      const resp = await walletClient.getAccounts({ owner: ctx.primaryParty, custodian: null });
      return resp.accounts;
    }
  };

  const fetchBalances = async (account: AccountSummary) => {
    if (ctx.primaryParty !== "") {
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
    fetchAccounts().then((res) => {
      const promises = res?.map((account: AccountSummary) => {
        return fetchBalances(account).then((res_balances) => {
          return {
            account: {
              ...account,
              operatorsArray: account
                .view
                .controllers
                .outgoing
                .map
                .delete(account.view.owner)
                .entriesArray()
                .map(e => e[0])
            },
            balances: res_balances
          };
        });
      });

      if (promises) {
        Promise.all(promises).then((results) => {
          const accBalancesMap = new Map(accountBalancesMap);
          results.forEach(({ account, balances }) => {
            accBalancesMap.set(account, balances);
          });
          setAccountBalancesMap(accBalancesMap);
        });
      }
    });
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
        <AccountBalances accountBalancesMap={accountBalancesMap} />
      </div>
    </PageLayout>
  );
};

export default WalletScreen;
