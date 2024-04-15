import React, { useState, useEffect, useContext, useMemo } from "react";
import { Route, Routes } from "react-router-dom";
import { createLedgerContext } from "@daml/react";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthenticationGuard } from "./components/authentication-guard";
import { PageLoader } from "./components/layout/page-loader";
import FundScreen from "./pages/FundScreen";
// import AccountBalanceScreen from "./pages/AccountBalanceScreen";
import SettlementScreen from "./pages/SettlementScreen";
import DirectoryScreen from "./pages/DirectoryScreen";
import AssetDetailsScreen from "./pages/AssetDetailsScreen";
import WalletScreen from "./pages/WalletScreen";
import { FundSubscribeFormScreen } from "./pages/FundSubscribeFormScreen";
import BalanceRedeemFormScreen from "./pages/BalanceRedeemFormScreen";
import AccountOfferScreen from "./pages/AccountOfferScreen";
import IssuersScreen from "./pages/IssuersScreen";
import { InstrumentCreateFormScreen } from "./pages/InstrumentCreateFormScreen";
import OffersScreen from "./pages/OffersScreen";
import { OfferAcceptFormScreen } from "./pages/OfferAcceptFormScreen";
import { SettlementActionScreen } from "./pages/SettlementActionScreen";
import { Party } from "@daml/types";
import { WalletViewsClient } from "@synfini/wallet-views";
import { walletMode } from "./Configuration";

type AuthContext = {
  token: string;
  setPrimaryParty: (primaryParty: Party) => void;
  setReadOnly: (readOnly: boolean) => void;
  primaryParty: string;
  readOnly: boolean;
};

const AuthContextStore = React.createContext<AuthContext | undefined>(undefined);

export const userContext = createLedgerContext();

const App: React.FC = () => {
  const { isLoading, getAccessTokenSilently, isAuthenticated } = useAuth0();

  const [token, setToken] = useState("");
  const [primaryParty, setPrimaryParty] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  
  const modeStyle = {
    backgroundColor: walletMode === "investor" ? "var(--black)" : "var(--issuer)"
  };

  useEffect(() => {
    const fetchToken = async () => {
      const authToken = await getAccessTokenSilently();
      setToken(authToken);
    };

    fetchToken();
  });

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  const commonRoutes = [
    (<Route path="/" element={<AuthenticationGuard component={WalletScreen} />} />),
    //(<Route path="/wallet/account/balance" element={<AuthenticationGuard component={AccountBalanceScreen} />} />),
    (<Route path="/asset" element={<AuthenticationGuard component={AssetDetailsScreen} />} />),
    (<Route path="/wallet/account/balance/redeem" element={<AuthenticationGuard component={BalanceRedeemFormScreen} />} />),
    (<Route path="/settlements" element={<AuthenticationGuard component={SettlementScreen} />} />),
    (<Route path="/directory" element={<AuthenticationGuard component={DirectoryScreen} />} />),
    (<Route path="/fund" element={<AuthenticationGuard component={FundScreen} />} />),
    (<Route path="/fund/subscribe" element={<AuthenticationGuard component={FundSubscribeFormScreen} />} />),
    (<Route path="/account/create" element={<AuthenticationGuard component={AccountOfferScreen} />} />),
    (<Route path="/offers" element={<AuthenticationGuard component={OffersScreen} />} />),
    (<Route path="/offer/accept" element={<AuthenticationGuard component={OfferAcceptFormScreen} />} />),
    (<Route path="/settlement/action" element={<AuthenticationGuard component={SettlementActionScreen} />} />)
  ];
  const issuerRoutes = [
    (<Route path="/issuers/" element={<AuthenticationGuard component={IssuersScreen} />} />),
    (<Route path="/issuers/instrument/create" element={<AuthenticationGuard component={InstrumentCreateFormScreen} />} />)
  ];
  const routes = walletMode === "investor" ? commonRoutes : commonRoutes.concat(issuerRoutes);

  return (
    <AuthContextStore.Provider value={{token, primaryParty, setPrimaryParty, readOnly, setReadOnly}}>
      <userContext.DamlLedger token={token} party={primaryParty} >
      <style>
      {`
          body { background-color: ${modeStyle.backgroundColor}; }
          .nav-bar__container { background-color: ${modeStyle.backgroundColor}; }
          .page-footer { background-color: ${modeStyle.backgroundColor}; }
      `}
      </style>
      <Routes>
        {isAuthenticated ? routes : (<Route path="/" element={<WalletScreen />} />)}
      </Routes>
      </userContext.DamlLedger>
    </AuthContextStore.Provider>
  );
};

export default App;

const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || "";

export function useWalletViews(): WalletViewsClient {
  const ctx = useContext(AuthContextStore);
  const walletViewsClient = useMemo(
    () => new WalletViewsClient({ token: ctx?.token || "", baseUrl: walletViewsBaseUrl }),
    [ctx?.token]
  );
  return walletViewsClient;
}

export function useWalletUser(): { primaryParty?: Party; readOnly: boolean; } {
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);

  const tokenIsPresent = ctx !== undefined && ctx.token === "";

  useEffect(() => {
    const fetchPrimaryParty = async () => {
      if (ctx !== undefined && ctx.primaryParty === "" && ctx.token !== "") {
        try {
          const user = await ledger.getUser();
          const rights = await ledger.listUserRights();
          const readOnly = (
            rights.find(right => right.type === "CanActAs" && right.party === user.primaryParty) === undefined
          );
          ctx.setReadOnly(readOnly);

          if (user.primaryParty !== undefined) {
            ctx.setPrimaryParty(user.primaryParty);
          }
        } catch (err) {
          console.log("Error fetching primary party", err);
        }
      }
    };
    fetchPrimaryParty();
  }, [tokenIsPresent, ctx, ledger]);

  return {
    primaryParty: ctx?.primaryParty || "",
    readOnly: ctx?.readOnly || false
  };
}
