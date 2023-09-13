import { useAuth0 } from "@auth0/auth0-react";
import { NavBarTab } from "./nav-bar-tab";

export const NavBarTabs = () => {
  const { isAuthenticated } = useAuth0();



  const walletTab = <><NavBarTab path="/wallet" label="Wallet" /><NavBarTab path="/settlements" label="Transactions" /></>;


  const returnTab = 
    isAuthenticated &&  walletTab;
    
  
  return (
    <div className="nav-bar__tabs">

      <NavBarTab path="/" label="Home" /> 
      {returnTab}
    
    </div>
  );
};
