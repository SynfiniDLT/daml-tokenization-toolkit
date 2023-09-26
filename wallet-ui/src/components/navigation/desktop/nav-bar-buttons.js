import { useAuth0 } from "@auth0/auth0-react";
import React ,{useContext} from "react";
import { LoginButton } from "../../buttons/login-button";
import { LogoutButton } from "../../buttons/logout-button";
import AuthContextStore from "../../../store/AuthContextStore";

export const NavBarButtons = () => {
  const { isAuthenticated, user } = useAuth0();
  const ctx = useContext(AuthContextStore);

  return (
    <div className="nav-bar__buttons">
      {!isAuthenticated && (
        <>
          <LoginButton />
        </>
      )}
      {isAuthenticated && (
        <>
          <div style={{ position: "absolute", right: "20%", bottom: "15%" }}>
            {user !== undefined && user.email} <br />
            {ctx.primaryParty !== '' && (
              ctx.primaryParty.substring(0,30) + "..."
            )}
            <br />
            {ctx.readOnly && ("Observer mode")}
          </div>
          <div>
            <LogoutButton />
          </div>
        </>
      )}
    </div>
  );
};
