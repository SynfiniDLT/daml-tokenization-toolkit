import { Balance } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";
import { formatCurrency } from "../../Util";
import HoverPopUp from "./hoverPopUp";


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
          <table className="assets">
            <thead>
              <tr>
                <th>Asset Name<QuestionCircle /></th>
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
                    <HoverPopUp triggerText={balance.instrument.id.unpack} popUpContent={balance.instrument.version} />
                  </td>
                  <td><HoverPopUp triggerText={balance.instrument.depository.substring(0, 30)+"..."} popUpContent={balance.instrument.depository} customLeft="100%" /></td>
                  <td><HoverPopUp triggerText={balance.instrument.issuer.substring(0, 30)+"..."} popUpContent={balance.instrument.issuer} customLeft="100%" /></td>
                  <td>{formatCurrency((parseFloat(balance.unlocked) + parseFloat(balance.locked)).toString(),"en-US")}</td>
                  <td>{formatCurrency(balance.unlocked,"en-US")}</td>
                  <td>{formatCurrency(balance.locked,"en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
      )}
    </>
  );
}
