import { Balance } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";

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
        <>
          <table id="customers">
            <thead>
              <tr>
                <th>Instrument | Version<QuestionCircle /></th>
                <th>Depository<QuestionCircle /></th>
                <th>Issuer<QuestionCircle /></th>
                <th>Balance(locked and unlocked)<QuestionCircle /></th>
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
                  <td>{balance.unlocked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
