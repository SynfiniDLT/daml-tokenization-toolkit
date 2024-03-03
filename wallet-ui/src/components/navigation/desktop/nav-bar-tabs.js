import { useAuth0 } from "@auth0/auth0-react";
import { NavBarTab } from "./nav-bar-tab";

export const NavBarTabs = () => {
  const walletMode = process.env.REACT_APP_MODE || "";
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

  const fundTab = (
    <>
      <NavBarTab path="/" label="Home" />
      <NavBarTab path="/wallet" label="Fund Wallet" />
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
      <NavBarTab path="/issuers" label="Instruments" />
      <NavBarTab path="/settlements" label="Transactions" />
      <NavBarTab path="/directory" label="Directory" />
    </>
  );

  const LoginTab = (
    <NavBarTab path="/" label="Home" />
  )

  let returnTab;

  if (walletMode===("investor")){
    returnTab = investorTab;
  }else if (walletMode===("fund")){
    returnTab = fundTab;
  }else if  (walletMode===("issuer")){
    returnTab = issuerTab;
  }
  
  return (
    <div className="nav-bar__tabs">
      {isAuthenticated? returnTab: LoginTab}
    </div>
  );
};
