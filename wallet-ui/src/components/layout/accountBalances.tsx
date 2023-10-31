import { useNavigate } from "react-router-dom";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { formatCurrency } from "../Util";
import { useAuth0 } from "@auth0/auth0-react";

export default function AccountBalances(props: { accountBalances?: any }) {
  const { user } = useAuth0();
  const nav = useNavigate();
  const entries = Array.from(props.accountBalances.entries());

  const handleSeeDetails = (account: AccountSummary) => {
    nav("/wallet/account/balance/sbt", { state: { account: account } });
  };

  const handleRedeem = (balance: any) => {
    console.log("balance action",balance)
    nav("/wallet/account/balance/redeem", { state: { balance: balance } });
  };
  

  let trAssets: any = [];
  let trSbts: any = [];
  entries.forEach((entry: any) => {
    if (entry[0].view.id.unpack !== "sbt") {
      entry[1].forEach((balance: any) => {
        const trAsset = (
          <tr key={balance.account.id.unpack}>
            <td>account {balance.account.id.unpack} </td>
            <td>{balance.instrument.id.unpack} </td>
            <td>{entry[0].view.description} </td>
            
            {balance.instrument.id.unpack === 'AUDN' ?
              <>
              <td>
              {formatCurrency(
                (
                  parseFloat(balance.unlocked) + parseFloat(balance.locked)
                ).toString(),
                "en-US"
              )}
            </td>
                <td>{formatCurrency(balance.unlocked, "en-US")}</td>
                <td>{formatCurrency(balance.locked, "en-US")}</td>
              </>
            : 
              <>
                <td>{Number(balance.unlocked)}</td>
                <td>{Number(balance.unlocked)}</td>
                <td>-</td>
              </>
            }
            <td>
              {balance.instrument.id.unpack === 'AUDN' && !user?.name?.toLowerCase().includes("employee") &&
                <button onClick={() => handleRedeem(balance)}>Redeem</button>
              }
            </td>

          </tr>
        );
        trAssets.push(trAsset);
      });
    }

    if (entry[0].view.id.unpack === "sbt") {
      entry[1].forEach((balance: any) => {
        const trSbt = (
          <tr key={balance.instrument.id.unpack}>
            <td>
              {balance.instrument.id.unpack} | {balance.instrument.version}
            </td>
            <td>{balance.instrument.issuer.substring(0, 30)} </td>
            <td>
              <button onClick={() => handleSeeDetails(entry[0])}>
                See Details
              </button>
            </td>
          </tr>
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
        <table id="customers">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>Asset Type</th>
              <th>Description</th>
              <th>Balance</th>
              <th>Balance Unlocked</th>
              <th>Balance locked</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{trAssets}</tbody>
        </table>
      </div>

      {trSbts.length > 0 && (
        <>
          <div style={{ marginTop: "15px" }}>
            <h4 className="profile__title">SBTs</h4>
          </div>
          <div style={{ margin: "10px", padding: "10px" }}>
            <table id="customers">
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
