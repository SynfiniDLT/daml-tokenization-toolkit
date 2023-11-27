import { useAuth0 } from "@auth0/auth0-react";
import { NavBarTab } from "./nav-bar-tab";

export const NavBarTabs = () => {
  const { isAuthenticated } = useAuth0();

  const walletTab = (
    <>
      <NavBarTab path="/wallet" label="Wallet" />
      <NavBarTab path="/fund" label="Invest" />
      <NavBarTab path="/settlements" label="Transactions" />
      <NavBarTab path="/directory" label="Directory" />
    </>
  );

  const LoginTab = (
    <NavBarTab path="/" label="Wallet" />
  )

  const returnTab = isAuthenticated ? walletTab : LoginTab;

  return (
    <div className="nav-bar__tabs">
      {returnTab}
    </div>
  );
};
