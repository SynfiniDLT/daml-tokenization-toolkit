import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import InstrumentDetails from "./instrumentDetails";

export default function Instruments(props: { instruments?: InstrumentSummary[] }) {
  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
          {props.instruments.length ===0 &&
            <span style={{color:"white"}}>No SBT contents have been shared with this user.</span>
          }
            {props.instruments.map((instrument: InstrumentSummary, index: number) => (
              <div key={index}>
                <InstrumentDetails
                  instrument={instrument}
                  key={instrument.cid}
                ></InstrumentDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
