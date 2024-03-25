import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore, { isDefinedPrimaryParty } from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import Funds from "../components/layout/funds";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer"
import { CreateEvent } from "@daml/ledger";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";

const FundScreen: React.FC = () => {
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const { isLoading, user } = useAuth0();
  const [funds, setFunds] = useState<CreateEvent<SettlementOpenOffer, undefined, string>[]>();

  const fetchFunds = async () => {
    if (isDefinedPrimaryParty(ctx.primaryParty)) {
      const resp = await ledger.query(SettlementOpenOffer, { offerId: { unpack: "FundInvestment"} });
      setFunds(resp);
    }
  };

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchFunds();
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
