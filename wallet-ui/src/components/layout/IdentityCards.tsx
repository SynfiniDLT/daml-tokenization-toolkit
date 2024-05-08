import { InstrumentMetadataSummary } from "../../Util";
import { partyNameAttribute } from "../../Configuration";
import HoverPopUp from "./hoverPopUp";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { useNavigate } from "react-router-dom";

export default function IdentityCards(props: { instruments?: InstrumentMetadataSummary[] }) {
  const nav = useNavigate();

  function handleNameClick(instrument: InstrumentKey): void {
    nav("/asset", { state: { instrument } });
  };

  return (
    <>
      <div>
        <div style={{ margin: "10px", padding: "10px" }}>
          <table className="assets">
            <thead>
              <tr>
                <th>Name</th>
                <th>Party ID</th>
              </tr>
            </thead>
            <tbody>
              {props.instruments?.map(instrument => (
                <tr key={instrument.instrument.cid}>
                  <td>
                    <a href="/#" onClick={() => handleNameClick(instrument.metadata.view.instrument)}>
                      {instrument.metadata.view.attributes.get(partyNameAttribute)?.attributeValue}
                    </a>
                  </td>
                  <td>
                    <HoverPopUp
                      triggerText={instrument.holding.view.account.owner}
                      popUpContent={instrument.holding.view.account.owner}
                      customLeft="50%"
                    />
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
