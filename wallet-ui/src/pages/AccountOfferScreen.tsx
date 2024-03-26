import React, { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import { AccountOpenOfferSummary, AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AccountOffers from "../components/layout/accountOffers";
import Accounts from "../components/layout/accounts";
import { useWalletUser, useWalletViews } from "../App";

const AccountOfferScreen: React.FC = () => {
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();

  const [accountOffers, setAccountOffers] = useState<AccountOpenOfferSummary[]>();
  const [accounts, setAccounts] = useState<AccountSummary[]>();
  const [isLoading] = useState<boolean>(false);

  const fetchAccounts = async () => {
    if (primaryParty !== undefined) {
      const resp = await walletClient.getAccountOpenOffers({});
      setAccountOffers(resp.accountOpenOffers);
      const respAcc = await walletClient.getAccounts({ owner: primaryParty, custodian: null });
      setAccounts(respAcc.accounts);
    }
  };

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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ flex: 1, marginRight: "15px" }}>
            <h4 className="profile__title">My Accounts</h4>
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
