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
import AccountOfferScreen from "./pages/AccountOfferScreen";
import IssuersScreen from "./pages/IssuersScreen";
import { InstrumentCreateFormScreen } from "./pages/InstrumentCreateFormScreen";
import { OfferFormScreen } from "./pages/OfferFormScreen";
import OffersScreen from "./pages/OffersScreen";
import { OfferAcceptFormScreen } from "./pages/OfferAcceptFormScreen";
import { SettlementActionScreen } from "./pages/SettlementActionScreen";

export const userContext = createLedgerContext();

const App: React.FC = () => {
  const { isLoading, getAccessTokenSilently, isAuthenticated } = useAuth0();

  const [token, setToken] = useState<string>("");
  const [primaryParty, setPrimaryParty] = useState<string>('');
  const [readOnly, setReadOnly] = useState<boolean>(false);
  const walletMode = process.env.REACT_APP_MODE || "";
  const modeStyle = {
    backgroundColor:
      walletMode === 'investor'
        ? 'var(--black)'
        : walletMode === 'issuer'
        ? 'var(--issuer)' 
        : walletMode === 'fund'
        ? 'var(--fund)' 
        : 'var(--black)',
  };


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
      <style>
      {`
          body { background-color: ${modeStyle.backgroundColor}; }
          .nav-bar__container { background-color: ${modeStyle.backgroundColor}; }
          .page-footer { background-color: ${modeStyle.backgroundColor}; }
      `}
      </style>
      <Routes>
        {isAuthenticated ? (
          walletMode===("investor") ? (
            <>
              <Route path="/" element={<AuthenticationGuard component={WalletScreen} />} />
              <Route path="/wallet" element={<AuthenticationGuard component={WalletScreen} />} />
              <Route path="/wallet/account/balance" element={<AuthenticationGuard component={AccountBalanceScreen} />} />
              <Route path="/wallet/account/balance/sbt" element={<AuthenticationGuard component={AccountBalanceSbtScreen} />} />
              <Route path="/wallet/account/balance/redeem" element={<AuthenticationGuard component={BalanceRedeemFormScreen} />} />
              <Route path="/settlements" element={<AuthenticationGuard component={SettlementScreen} />} />
              <Route path="/directory" element={<AuthenticationGuard component={DirectoryScreen} />} />
              <Route path="/fund" element={<AuthenticationGuard component={FundScreen} />} />
              <Route path="/fund/subscribe" element={<AuthenticationGuard component={FundSubscribeFormScreen} />} />
              <Route path="/account/create" element={<AuthenticationGuard component={AccountOfferScreen} />} />
              <Route path="/offers" element={<AuthenticationGuard component={OffersScreen} />} />
              <Route path="/offer/accept" element={<AuthenticationGuard component={OfferAcceptFormScreen} />} />
              <Route path="/settlement/action" element={<AuthenticationGuard component={SettlementActionScreen} />} />
            </>
          ) : walletMode===("fund") ? (
            <>
              <Route path="/" element={<AuthenticationGuard component={HomeScreen} />} />
              <Route path="/wallet" element={<AuthenticationGuard component={WalletScreen} />} />
              <Route path="/settlements" element={<AuthenticationGuard component={SettlementScreen} />} />
              <Route path="/directory" element={<AuthenticationGuard component={DirectoryScreen} />} />
              <Route path="/funds" element={<AuthenticationGuard component={HomeScreen} />} />
            </>
          ) : walletMode===("issuer") ? (
            <>
              <Route path="/" element={<AuthenticationGuard component={HomeScreen} />} />
              <Route path="/wallet" element={<AuthenticationGuard component={WalletScreen} />} />
              <Route path="/wallet/account/balance" element={<AuthenticationGuard component={AccountBalanceScreen} />} />
              <Route path="/settlements" element={<AuthenticationGuard component={SettlementScreen} />} />
              <Route path="/directory" element={<AuthenticationGuard component={DirectoryScreen} />} />
              <Route path="/issuers/" element={<AuthenticationGuard component={IssuersScreen} />} />
              <Route path="/issuers/instrument/create" element={<AuthenticationGuard component={InstrumentCreateFormScreen} />} />
              <Route path="/account/create" element={<AuthenticationGuard component={AccountOfferScreen} />} />
              <Route path="/offers" element={<AuthenticationGuard component={OffersScreen} />} />
              <Route path="/offers/create" element={<AuthenticationGuard component={OfferFormScreen} />} />
              <Route path="/offer/accept" element={<AuthenticationGuard component={OfferAcceptFormScreen} />} />
              <Route path="/settlement/action" element={<AuthenticationGuard component={SettlementActionScreen} />} />

            </>
          ) : (
            <></>
          )
        ) : (
          <Route path="/" element={<HomeScreen />} />
        )}
      </Routes>
      </userContext.DamlLedger>
    </AuthContextStore.Provider>
  );
};

export default App;
