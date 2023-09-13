import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLayout } from "../components/PageLayout";

const MainScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuth0();

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
              </div>
            </div>
          </div>
          
        </>
      )}
    </PageLayout>
  );
};

export default MainScreen;
