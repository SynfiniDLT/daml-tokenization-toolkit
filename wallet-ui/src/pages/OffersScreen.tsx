import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import Offers from "../components/layout/offers";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer"
import { CreateEvent } from "@daml/ledger";
import { useWalletUser } from "../App";

const OfferScreen: React.FC = () => {
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();

  const { isLoading } = useAuth0();
  const [offers, setOffers] = useState<CreateEvent<SettlementOpenOffer, undefined, string>[]>();

  useEffect(() => {
    const fetchOffers = async () => {
      if (primaryParty !== undefined) {
        const resp = await ledger.query(SettlementOpenOffer);
        setOffers(
          resp.filter(offer =>
            !offer.payload.offerers.map.has(primaryParty) &&
            (offer.payload.permittedTakers === null || offer.payload.permittedTakers.map.has(primaryParty))
          )
        );
      }
    };

    fetchOffers();
  }, [primaryParty, ledger]);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <div>
        <div style={{ marginTop: "15px" }}>
          <h4 className="profile__title">Offers</h4>
        </div>
        <Offers offers={offers} />
      </div>

    </PageLayout>
  );
};

export default OfferScreen;
