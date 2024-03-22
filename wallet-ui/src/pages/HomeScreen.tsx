import React, { useContext, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLayout } from "../components/PageLayout";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import AuthContextStore from "../store/AuthContextStore";
import { userContext } from "../App";

const HomeScreen: React.FC = () => {
  const walletMode = process.env.REACT_APP_MODE || "";
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();
  const { isAuthenticated, user } = useAuth0();  

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  return (
    <PageLayout>
      {isAuthenticated && user !== undefined && (
        <>
          <div className="profile-grid">
            <div className="profile__header">
              <img
                src={user.picture}
                alt="Profile"
                className="profile__avatar"
              />
              <div className="profile__headline">
                <h2 className="profile__title">{user.name}</h2>
                <span className="profile__description">{user.email}</span>
                <span className="profile__description">{walletMode[0].toUpperCase() + walletMode.substring(1)} Wallet</span>
              </div>
            </div>
          </div>

        </>
      )}
    </PageLayout>
  );
};

export default HomeScreen;
