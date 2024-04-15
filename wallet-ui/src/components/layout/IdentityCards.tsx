import IdentityDetails from "./identityDetails";
import { InstrumentMetadataSummary, nameFromParty } from "../../Util";
import { partyNameAttribute } from "../../Configuration";
import HoverPopUp from "./hoverPopUp";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { useNavigate } from "react-router-dom";

export default function IdentityCards(props: { instruments?: InstrumentMetadataSummary[] }) {
  const nav = useNavigate();
  console.log('props === ', props);

  function handleInstrumentModal(instrument: InstrumentKey): void {
    nav("/asset", { state: { instrument } });
  }

  return (
    <>
      {/* <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
          {props.instruments.length === 0 &&
            <span style={{color:"white"}}>No directory contents have been shared with this user.</span>
          }
            {props.instruments.map((instrument, index) => (
              <div key={index}>
                <IdentityDetails
                  instrument={instrument}
                  key={instrument.instrument.cid}
                ></IdentityDetails>
              </div>
            ))}
          </>
        )}
      </div> */}
      <div>
        {/* <div style={{ marginTop: "15px" }}>
          <h4 className="profile__title">{account.view.description}</h4>
          <h5 className="profile__title">Provider: {account.view.custodian}</h5>
          <h5 className="profile__title">Account ID: {account.view.id.unpack}</h5>
        </div> */}
        <div style={{ margin: "10px", padding: "10px" }}>
          <table className="assets">
            <thead>
              <tr>
                <th>Name</th>
                <th>Party ID</th>
                <th>Identity token</th>
              </tr>
            </thead>
            <tbody>
              {props.instruments?.map((instrument, index) => (
                <tr key={instrument.instrument.cid}>
                  <td>
                    {instrument.metadata.view.attributes.get(partyNameAttribute)?.attributeValue}
                  </td>
                  <td>
                    <HoverPopUp
                      triggerText={nameFromParty(instrument.holding.view.account.owner)}
                      popUpContent={instrument.holding.view.account.owner}
                    />
                  </td>
                  <td>
                    <a onClick={() => handleInstrumentModal(instrument.metadata.view.instrument)}>
                      {instrument.metadata.view.instrument.version}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
