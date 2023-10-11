import { Balance } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";
import { formatCurrency } from "../Util";


export default function Balances(props: { balances?: Balance[] }) {

  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h5 className="profile__title">Balances</h5>
      </div>
      
      {props.balances?.length ===0 && (
          <p>There is no balance for this account.</p>
      )}

      {props.balances !== undefined && props.balances?.length >0 && (
          <table id="customers">
            <thead>
              <tr>
                <th>Instrument | Version<QuestionCircle /></th>
                <th>Depository<QuestionCircle /></th>
                <th>Issuer<QuestionCircle /></th>
                <th>Balance<QuestionCircle /></th>
                <th>Balance Unlocked<QuestionCircle /></th>
                <th>Balance Locked<QuestionCircle /></th>
              </tr>
            </thead>
            <tbody>
              {props.balances.map((balance: Balance, index: number) => (
                <tr key={`${balance.instrument.depository}|${balance.instrument.issuer}|${balance.instrument.id}|${balance.instrument.version}`}>
                  <td>
                    {balance.instrument.id.unpack} {" | "}
                    version: {balance.instrument.version}
                  </td>
                  <td>{balance.instrument.depository.substring(0, 30)}...</td>
                  <td>{balance.instrument.issuer.substring(0, 30)}...</td>
                  <td>{formatCurrency((parseFloat(balance.unlocked) + parseFloat(balance.locked)).toString(),'en-US','USD')}</td>
                  <td>{formatCurrency(balance.unlocked,'en-US','USD')}</td>
                  <td>{formatCurrency(balance.locked,'en-US','USD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
      )}
    </>
  );
}
