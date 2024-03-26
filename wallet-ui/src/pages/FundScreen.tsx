import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import Funds from "../components/layout/funds";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer"
import { CreateEvent } from "@daml/ledger";
import { useWalletUser } from "../App";

const FundScreen: React.FC = () => {
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();

  const { isLoading, user } = useAuth0();
  const [funds, setFunds] = useState<CreateEvent<SettlementOpenOffer, undefined, string>[]>();

  const fetchFunds = async () => {
    if (primaryParty !== undefined) {
      const resp = await ledger.query(SettlementOpenOffer, { offerId: { unpack: "FundInvestment"} });
      setFunds(resp);
    }
  };

  useEffect(() => {
    fetchFunds();
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
      <div>
        {!user?.name?.toLowerCase().includes("employee") && 
          <>
            <div style={{ marginTop: "15px" }}>
              <h4 className="profile__title">Funds</h4>
            </div>
            <Funds funds={funds} />
          </>
        }
      </div>

    </PageLayout>
  );
};

export default FundScreen;
