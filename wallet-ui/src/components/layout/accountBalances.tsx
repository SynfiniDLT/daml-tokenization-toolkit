import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { formatCurrency, nameFromParty } from "../Util";
import { Coin } from "react-bootstrap-icons";
import HoverPopUp from "./hoverPopUp";
import InstrumentPopDetails from "./instrumentPopDetails";
import { useState } from "react";

export default function AccountBalances(props: { accountBalancesMap?: any }) {
  const { user } = useAuth0();
  const nav = useNavigate();
  const accountBalanceEntries = Array.from(props.accountBalancesMap.entries());
  const [instrument, setInstrument] = useState<any>();
  const [isOpen, setIsOpen] = useState<boolean>(false);


  const handleSeeDetails = (account: AccountSummary) => {
    nav("/wallet/account/balance/sbt", { state: { account: account } });
  };

  const handleRedeem = (balance: any, account: any) => {
    nav("/wallet/account/balance/redeem", { state: { balance: balance, account: account } });
  };

  const handleInstrumentModal = (instrument: any) => {
     setInstrument(instrument);
     setIsOpen(!isOpen);
  }

  let trAssets: any = [];
  let trSbts: any = [];
  accountBalanceEntries.forEach((accountBalanceEntry: any) => {
    const keyAccount = accountBalanceEntry[0];
    const valueBalance = accountBalanceEntry[1];
    if (keyAccount.view.id.unpack !== "sbt") {
      valueBalance.forEach((balance: any) => {
        const trAsset = (
          
          
            <tr key={balance.instrument.id.unpack}>
              <td>{balance.account.id.unpack} </td>
              <td>
                {balance.instrument.id.unpack === "AUDN" && (
                  <>
                    <Coin />
                    &nbsp;&nbsp;
                  </>
                )}
                <a href="#" onClick={() => handleInstrumentModal(balance.instrument)}>
                  <HoverPopUp triggerText={balance.instrument.id.unpack} popUpContent={balance.instrument.version} />
                </a>
              </td>
              <td>{keyAccount.view.description} </td>
              <td><HoverPopUp triggerText={nameFromParty(balance.instrument.issuer)} popUpContent={balance.instrument.issuer} /></td>

              {balance.instrument.id.unpack === "AUDN" ? (
                <>
                  <td>
                    {formatCurrency((parseFloat(balance.unlocked) + parseFloat(balance.locked)).toString(), "en-US")} <Coin />
                  </td>
                  <td>{formatCurrency(balance.unlocked, "en-US")} <Coin /></td>
                  <td>{formatCurrency(balance.locked, "en-US")} <Coin /></td>
                </>
              ) : (
                <>
                  <td>{Number(balance.unlocked)}</td>
                  <td>{Number(balance.unlocked)}</td>
                  <td>-</td>
                </>
              )}
              <td>
                {balance.instrument.id.unpack === "AUDN" && !user?.name?.toLowerCase().includes("employee") && (
                  <button onClick={() => handleRedeem(balance, keyAccount)}>Redeem</button>
                  )}
              </td>
            </tr>
          
        );
        trAssets.push(trAsset);
      });
    }

    if (keyAccount.view.id.unpack === "sbt") {
      valueBalance.forEach((balance: any) => {
        const trSbt = (
          <>
          <tr key={balance.instrument.id.unpack}>
            <td>
              {balance.instrument.id.unpack} | {balance.instrument.version}
            </td>
            <td>
              <HoverPopUp triggerText={balance.instrument.issuer.substring(0, 30) + "..."} popUpContent={balance.instrument.issuer} />
            </td>
            <td>
              <button onClick={() => handleSeeDetails(keyAccount)}>See Details</button>
            </td>
          </tr>
          </>
        );
        trSbts.push(trSbt);
      });
    }
  });

  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">Assets</h4>
      </div>
      <div style={{ margin: "10px", padding: "10px" }}>
        <table id="assets">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>Asset Name</th>
              <th>Description</th>
              <th>Issuer</th>
              <th>Balance</th>
              <th>Balance Unlocked</th>
              <th>Balance locked</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{trAssets}</tbody>
        </table>
      </div>
      <InstrumentPopDetails instrument={instrument} isOpen={isOpen} handleClose={() => setIsOpen(false)}/>
      {trSbts.length > 0 && (
        <>
          <div style={{ marginTop: "15px" }}>
            <h4 className="profile__title">SBTs</h4>
          </div>
          <div style={{ margin: "10px", padding: "10px" }}>
            <table id="assets">
              <thead>
                <tr>
                  <th>SBT ID</th>
                  <th>Issuer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{trSbts}</tbody>
            </table>
          </div>
        </>
      )}
      
    </>
  );
}
