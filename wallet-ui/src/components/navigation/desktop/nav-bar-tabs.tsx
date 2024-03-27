import { useAuth0 } from "@auth0/auth0-react";
import { NavBarTab } from "./nav-bar-tab";
import { walletMode } from "../../../App";

export const NavBarTabs = () => {
  const { isAuthenticated } = useAuth0();

  const investorTab = (
    <>
      <NavBarTab path="/wallet" label="Wallet" />
      <NavBarTab path="/account/create" label="Accounts" />
      <NavBarTab path="/offers" label="Offers" />
      <NavBarTab path="/fund" label="Invest" />
      <NavBarTab path="/settlements" label="Transactions" />
      <NavBarTab path="/directory" label="Directory" />
    </>
  );

  const issuerTab = (
    <>
      <NavBarTab path="/" label="Home" />
      <NavBarTab path="/wallet" label="Wallet" />
      <NavBarTab path="/account/create" label="Accounts" />
      <NavBarTab path="/offers" label="Offers" />
      <NavBarTab path="/issuers" label="Environmental Tokens" />
      <NavBarTab path="/settlements" label="Transactions" />
      <NavBarTab path="/directory" label="Directory" />
    </>
  );

  const LoginTab = (
    <NavBarTab path="/" label="Home" />
  )

  let returnTab;

  if (walletMode === "investor"){
    returnTab = investorTab;
  } else if  (walletMode === "issuer") {
    returnTab = issuerTab;
  }

  return (
    <div className="nav-bar__tabs">
      {isAuthenticated? returnTab: LoginTab}
    </div>
  );
};
