import React, { useContext, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLayout } from "../components/PageLayout";
import { useLocation } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";

const BalanceRedeemFormScreen: React.FC = () => {
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const { user, isAuthenticated, isLoading } = useAuth0();
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}/wallet-views`;

  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [inputQtd, setInputQtd] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  //   const [result, setResult] = useState(null);
  
  console.log("state balance", state.balance)
  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Redeem Balance
      </h3>
    </PageLayout>
  );
};

export default BalanceRedeemFormScreen;
