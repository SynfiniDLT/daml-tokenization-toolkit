import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import InstrumentTokenDetails from "./instrumentTokenDetails";

export default function InstrumentsToken(props: { instruments?: InstrumentSummary[] }) {
  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
          <div style={{ marginTop: "15px" }}>
          <h4 className="profile__title">Instruments</h4>
          </div>
          {props.instruments.length ===0 &&
            <span style={{color:"white"}}>There isn't any instrument created by this party.</span>
          }
            {props.instruments.map((instrument: InstrumentSummary, index: number) => (
              <div key={index}>
                <InstrumentTokenDetails
                  instrument={instrument}
                  key={instrument.cid}
                ></InstrumentTokenDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
