import React, { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { userContext } from "../App";
import { PageLoader } from "../components/layout/page-loader";
import { OneTimeOffer } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";
import Offers from "../components/layout/offers";
import { CreateEvent } from "@daml/ledger";

const OffersScreen: React.FC = () => {
  const ledger = userContext.useLedger();

  const [isLoading] = useState<boolean>(false);
  const [offers, setOffers] = useState<CreateEvent<OneTimeOffer, undefined, string>[]>();

  useEffect(() => {
    const fetchOffers = async () => {
      setOffers(await ledger.query(OneTimeOffer));
    }

    fetchOffers();
  }, [ledger]);

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
          <h4 className="profile__title">Requests</h4>
        </div>
        <Offers offers={offers}/>
      </>
    </PageLayout>
  );
};

export default OffersScreen;
