import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import Funds from "../components/layout/funds";
import { FundOffer } from "@daml.js/fund-tokenization/lib/Synfini/Fund/Offer";
import { CreateEvent } from "@daml/ledger";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";

const FundScreen: React.FC = () => {
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const { isLoading, user } = useAuth0();
  const [funds, setFunds] = useState<CreateEvent<FundOffer, undefined, string>[]>();

  const fetchFunds = async () => {
    if (ctx.primaryParty !== "") {
      const resp = await ledger.query(FundOffer);
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
