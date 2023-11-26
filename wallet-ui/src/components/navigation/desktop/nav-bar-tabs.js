import { useAuth0 } from "@auth0/auth0-react";
import { NavBarTab } from "./nav-bar-tab";

export const NavBarTabs = () => {
  const { isAuthenticated } = useAuth0();

  const walletTab = (
    <>
      <NavBarTab path="/fund" label="Funds" />
      <NavBarTab path="/settlements" label="Transactions" />
      <NavBarTab path="/directory" label="Directory" />
    </>
  );

  const returnTab = isAuthenticated && walletTab;

  return (
    <div className="nav-bar__tabs">
      <NavBarTab path="/" label="Invest" />
      {returnTab}
    </div>
  );
};
