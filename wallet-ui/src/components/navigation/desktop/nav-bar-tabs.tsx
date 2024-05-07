import { useAuth0 } from "@auth0/auth0-react";
import { NavBarTab } from "./nav-bar-tab";
import { walletMode } from "../../../Configuration";

export const NavBarTabs = () => {
  const { isAuthenticated } = useAuth0();

  const commonsTabs = [
    (<NavBarTab path="/" key="home" label="Home" />),
    (<NavBarTab path="/account/create" key="account-create" label="Open Account" />),
    (<NavBarTab path="/offers" key="requests" label="Requests" />),
    (<NavBarTab path="/settlements" key="settlements" label="Transactions" />),
    (<NavBarTab path="/directory" key="directory" label="Directory" />)
  ];
  const investorTabs = [(<NavBarTab path="/fund" key="fund" label="Invest" />)]
  const issuerTabs = [(<NavBarTab path="/issuers" key="issuers" label="Issuance" />)];
  const tabs = walletMode === "investor" ? commonsTabs.concat(investorTabs) : commonsTabs.concat(issuerTabs);
  const loginTab = (
    <NavBarTab path="/" label="Home" />
  );

  return (
    <div className="nav-bar__tabs">
      {isAuthenticated ? tabs : loginTab}
    </div>
  );
};
