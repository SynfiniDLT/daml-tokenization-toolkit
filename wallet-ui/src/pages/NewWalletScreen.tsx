import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AccountBalances from "../components/layout/accountBalances";

const NewWalletScreen: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}`;
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [accountBalancesMap, setAccountBalancesMap] = useState(new Map<any, any>());

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchUserLedger = async () => {
    try {
      const user = await ledger.getUser();
      const rights = await ledger.listUserRights();
      const found = rights.find((right) => right.type === "CanActAs" && right.party === user.primaryParty);
      ctx.readOnly = found === undefined;

      if (user.primaryParty !== undefined) {
        setPrimaryParty(user.primaryParty);
        ctx.setPrimaryParty(user.primaryParty);
      }
    } catch (err) {
      console.log("error when fetching primary party", err);
    }
  };

  const fetchAccounts = async () => {
    if (primaryParty !== "") {
      const resp = await walletClient.getAccounts({ owner: primaryParty });
      return resp.accounts;
    }
  };

  const fetchBalances = async (account: AccountSummary) => {
    if (primaryParty !== "") {
      const resp = await walletClient.getBalance({
        account: {
          owner: primaryParty,
          custodian: account.view.custodian,
          id: account.view.id,
        },
      });
      return resp.balances;
    }
    return [];
  };

  useEffect(() => {
    fetchUserLedger();
  }, []);

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

export default NewWalletScreen;
