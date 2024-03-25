import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import AuthContextStore from "../store/AuthContextStore";
import { userContext } from "../App";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { PageLoader } from "../components/layout/page-loader";
import { OneTimeOffer } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";
import Offers from "../components/layout/offers";
import { CreateEvent } from "@daml/ledger";

const OffersScreen: React.FC = () => {
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [isLoading] = useState<boolean>(false);
  const [offers, setOffers] = useState<CreateEvent<OneTimeOffer, undefined, string>[]>();

  const fetchOffers = async () => {
    setOffers(await ledger.query(OneTimeOffer));
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
