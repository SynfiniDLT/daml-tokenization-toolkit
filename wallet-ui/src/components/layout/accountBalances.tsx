import { useNavigate } from "react-router-dom";
import { AccountSummary, Balance } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { formatCurrency, nameFromParty } from "../../Util";
import { Coin } from "react-bootstrap-icons";
import HoverPopUp from "./hoverPopUp";
import InstrumentPopDetails from "./instrumentPopDetails";
import { useState } from "react";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";

export type AccountBalanceSummary = {account: AccountSummary, balances: Balance[]};

export default function AccountBalances(props: { accountBalances: AccountBalanceSummary[] }) {
  const nav = useNavigate();
  const [instrument, setInstrument] = useState<InstrumentKey>();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleSeeSbtDetails = (account: AccountSummary) => {
    nav("/wallet/account/balance/sbt", { state: { account: account } });
  };

  const handleRedeem = (balance: Balance, account: AccountSummary) => {
    nav("/wallet/account/balance/redeem", { state: { balance, account } });
  };

  const handleInstrumentModal = (instrument: InstrumentKey) => {
     setInstrument(instrument);
     setIsOpen(!isOpen);
  }

  const tableRows: [AccountSummary, JSX.Element[]][] = props.accountBalances.map(accountBalance => {
    const trs = accountBalance.balances.map(balance => {
      const actionButton =
        (balance.instrument.id.unpack === process.env.REACT_APP_STABLECOIN_INSTRUMENT_ID) ?
          (<button onClick={() => handleRedeem(balance, accountBalance.account)}>Redeem</button>) :
        (balance.instrument.id.unpack === process.env.REACT_APP_PARTY_ATTRIBUTES_INSTRUMENT_ID) ?
          (<button onClick={() => handleSeeSbtDetails(accountBalance.account)}>Manage access</button>) :
          (<></>);

      return (
        <tr key={balance.instrument.id.unpack}>
          <td>
            {balance.instrument.id.unpack === process.env.REACT_APP_STABLECOIN_INSTRUMENT_ID && (
              <>
                <Coin />
                &nbsp;&nbsp;
              </>
            )}
            <a href="#" onClick={() => handleInstrumentModal(balance.instrument)}>
              <HoverPopUp triggerText={balance.instrument.id.unpack} popUpContent={balance.instrument.version} />
            </a>
          </td>
          <td><HoverPopUp triggerText={nameFromParty(balance.instrument.issuer)} popUpContent={balance.instrument.issuer} /></td>
          <td>
            {formatCurrency((parseFloat(balance.unlocked) + parseFloat(balance.locked)).toString(), "en-US")}
          </td>
          <td>{formatCurrency(balance.unlocked, "en-US")} </td>
          <td>{formatCurrency(balance.locked, "en-US")} </td>
          <td>{actionButton}</td>
        </tr>
      );
    });

    return [accountBalance.account, trs];
  });

  return (
    <>
      {
        tableRows.map(row => {
          const [account, trs] = row;
          return (
            <div>
              <div style={{ marginTop: "15px" }}>
                <h4 className="profile__title">{account.view.description}</h4>
                <h5 className="profile__title">Provider: {account.view.custodian}</h5>
                <h5 className="profile__title">Account ID: {account.view.id.unpack}</h5>
              </div>
              <div style={{ margin: "10px", padding: "10px" }}>
                <table id="assets">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Issuer</th>
                      <th>Balance</th>
                      <th>Balance Unlocked</th>
                      <th>Balance locked</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{trs}</tbody>
                </table>
              </div>
              <InstrumentPopDetails instrument={instrument} isOpen={isOpen} handleClose={() => setIsOpen(false)}/>
              {/* {trSbts.length > 0 && (
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
              )} */}
            </div>
          );
        })
      }
    </>
  ) 
};
