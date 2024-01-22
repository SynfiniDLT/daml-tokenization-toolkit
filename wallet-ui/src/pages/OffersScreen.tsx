import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import AuthContextStore from "../store/AuthContextStore";
import { userContext } from "../App";
import { WalletViewsClient } from "@synfini/wallet-views";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { PageLoader } from "../components/layout/page-loader";
import { OneTimeOffer } from "@daml.js/settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";
import Offers from "../components/layout/offers";

const OffersScreen: React.FC = () => {
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || "";
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [offers, setOffers] = useState<any[]>();

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchOffers = async () => {
    let res = await ledger.query(OneTimeOffer);
    setOffers(res);
  }
  
  
  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);
  
  useEffect(() => {
    fetchOffers();
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
          <h4 className="profile__title">Offers</h4>
        </div>
        <Offers offers={offers}/>
      </>
    </PageLayout>
  );
};

export default OffersScreen;
