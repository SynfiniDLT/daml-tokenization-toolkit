import React, { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import { AccountOpenOfferSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AccountOffers from "../components/layout/accountOffers";
import { useWalletUser, useWalletViews } from "../App";

const AccountOfferScreen: React.FC = () => {
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();

  const [accountOffers, setAccountOffers] = useState<AccountOpenOfferSummary[]>();
  const [isLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchAccountOffers = async () => {
      if (primaryParty !== undefined) {
        const resp = await walletClient.getAccountOpenOffers({});
        setAccountOffers(resp.accountOpenOffers);
      }
    };

    fetchAccountOffers();
  }, [walletClient, primaryParty]);

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
          <div style={{ flex: 1 }}>
            <h4 className="profile__title">Open Account</h4>
            <AccountOffers accountOffers={accountOffers} />
          </div>
        </div>
      </>
    </PageLayout>
  );
};

export default AccountOfferScreen;
