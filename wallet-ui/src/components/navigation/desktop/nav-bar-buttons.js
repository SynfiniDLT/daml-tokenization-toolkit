import { useAuth0 } from "@auth0/auth0-react";
import { LoginButton } from "../../buttons/login-button";
import { LogoutButton } from "../../buttons/logout-button";
import HoverPopUp from "../../layout/hoverPopUp";
import { useWalletUser } from "../../../hooks/WalletViews";

export const NavBarButtons = () => {
  const { isAuthenticated, user } = useAuth0();
  const { primaryParty, readOnly } = useWalletUser();
  const walletMode = process.env.REACT_APP_MODE || "";

  return (
    <div className="nav-bar__buttons">
      {!isAuthenticated && (
        <>
          <LoginButton />
        </>
      )}
      {isAuthenticated && (
        <>
          <div style={{ position: "relative", right: "20%", bottom: "15%" }}>
            {user !== undefined && user.email} <br />
            <HoverPopUp popUpContent={primaryParty} triggerText={primaryParty === undefined ? "" : (primaryParty.substring(0,30) + "...")}></HoverPopUp>
            <br />
            {walletMode[0].toUpperCase() + walletMode.substring(1)} Wallet 
            <br/>
            {readOnly && ("Observer mode")}
          </div>
          <div>
            <LogoutButton />
          </div>
        </>
      )}
    </div>
  );
};
