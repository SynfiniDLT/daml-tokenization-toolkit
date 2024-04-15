import { useAuth0 } from "@auth0/auth0-react";
import { NavBarTab } from "./nav-bar-tab";
import { walletMode } from "../../../Configuration";

export const NavBarTabs = () => {
  const { isAuthenticated } = useAuth0();

  const commonsTabs = [
    (<NavBarTab path="/" label="Home" />),
    (<NavBarTab path="/account/create" label="Open Account" />),
    (<NavBarTab path="/offers" label="Offers" />),
    (<NavBarTab path="/fund" label="Invest" />),
    (<NavBarTab path="/settlements" label="Transactions" />),
    (<NavBarTab path="/directory" label="Directory" />)
  ];
  const issuerTabs = [(<NavBarTab path="/issuers" label="Environmental Tokens" />)];
  const tabs = walletMode === "investor" ? commonsTabs : commonsTabs.concat(issuerTabs);
  const loginTab = (
    <NavBarTab path="/" label="Home" />
  );

  return (
    <div className="nav-bar__tabs">
      {isAuthenticated ? tabs : loginTab}
    </div>
  );
};
