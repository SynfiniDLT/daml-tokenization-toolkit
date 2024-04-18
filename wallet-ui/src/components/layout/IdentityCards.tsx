import { InstrumentMetadataSummary, nameFromParty } from "../../Util";
import { partyNameAttribute } from "../../Configuration";
import HoverPopUp from "./hoverPopUp";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { useNavigate } from "react-router-dom";

export default function IdentityCards(props: { instruments?: InstrumentMetadataSummary[] }) {
  const nav = useNavigate();

  function handleInstrumentModal(instrument: InstrumentKey): void {
    nav("/asset", { state: { instrument } });
  }

  return (
    <>
      <div>
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
              {props.instruments?.map(instrument => (
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
