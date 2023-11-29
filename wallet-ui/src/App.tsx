import React, { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { createLedgerContext } from "@daml/react";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthenticationGuard } from "./components/authentication-guard";
import { PageLoader } from "./components/layout/page-loader";
import AuthContextStore from "./store/AuthContextStore";
import FundScreen from "./pages/FundScreen";
import AccountBalanceScreen from "./pages/AccountBalanceScreen";
import SettlementScreen from "./pages/SettlementScreen";
import DirectoryScreen from "./pages/DirectoryScreen";
import HomeScreen from "./pages/HomeScreen";
import AccountBalanceSbtScreen from "./pages/AccountBalanceSbtScreen";
import WalletScreen from "./pages/WalletScreen";
import { FundSubscribeFormScreen } from "./pages/FundSubscribeFormScreen";
import BalanceRedeemFormScreen from "./pages/BalanceRedeemFormScreen";

// Context for the party of the user.
export const userContext = createLedgerContext();

const App: React.FC = () => {
  const { isLoading, getAccessTokenSilently, isAuthenticated } = useAuth0();

  const [token, setToken] = useState<string>("");
  const [primaryParty, setPrimaryParty] = useState<string>('');
  const [readOnly, setReadOnly] = useState<boolean>(false);

  const fetchToken = async () => {
    const authToken = await getAccessTokenSilently();
    setToken(authToken)
  };
  
  useEffect(() => {
    fetchToken();
  });

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }
  return (
    <AuthContextStore.Provider value={{token: token, setPrimaryParty: setPrimaryParty, primaryParty: primaryParty, readOnly: readOnly}}>
      <userContext.DamlLedger token={token} party={primaryParty} >
      <Routes>
          {isAuthenticated ? <Route path="/" element={<AuthenticationGuard component={FundScreen} />} /> : <Route path="/" element={<HomeScreen />} />}
          
          <Route path="/wallet" element={<AuthenticationGuard component={WalletScreen} />} />
          <Route path="/wallet/account/balance" element={<AuthenticationGuard component={AccountBalanceScreen} />} />
          <Route path="/wallet/account/balance/sbt" element={<AuthenticationGuard component={AccountBalanceSbtScreen} />} />
          <Route path="/wallet/account/balance/redeem" element={<AuthenticationGuard component={BalanceRedeemFormScreen} />} />
          <Route path="/settlements" element={<AuthenticationGuard component={SettlementScreen} />} />
          <Route path="/directory" element={<AuthenticationGuard component={DirectoryScreen} />} />
          <Route path="/fund" element={<AuthenticationGuard component={FundScreen} />} />
          <Route path="/fund/subscribe" element={<AuthenticationGuard component={FundSubscribeFormScreen} />} />
          
      </Routes>
      </userContext.DamlLedger>
    </AuthContextStore.Provider>
  );
};

export default App;
