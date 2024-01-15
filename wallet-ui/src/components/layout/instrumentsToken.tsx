import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import InstrumentTokenTableDetails from "./instrumentTokenTableDetails";

export default function InstrumentsToken(props: { instruments?: InstrumentSummary[] }) {
  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
            <div style={{ marginTop: "15px" }}>
              <h4 className="profile__title">Instruments</h4>
            </div>
            {props.instruments.length === 0 && (
              <span style={{ color: "white" }}>There isn't any instrument created by this party.</span>
            )}
            <table id="assets">
              <thead>
                <tr>
                  <th>Product Type</th>
                  <th>Product Version</th>
                  <th>Certificate ID(UUID)</th>
                  <th>IPFS(url)</th>
                  <th>PIE Point Quantity</th>
                  <th>Issuing Price</th>
                  <th>Creation Date (dd/mm/yyyy HH:MM:ss:sss)</th>
                </tr>
              </thead>

              {props.instruments.map((instrument: InstrumentSummary, index: number) => (
                <tr key={index}>
                  <InstrumentTokenTableDetails
                    instrument={instrument}
                    key={instrument.cid}
                  ></InstrumentTokenTableDetails>
                </tr>
              ))}
              <tbody></tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
