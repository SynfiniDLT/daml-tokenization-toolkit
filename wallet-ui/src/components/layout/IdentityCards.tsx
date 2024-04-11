import IdentityDetails from "./identityDetails";
import { InstrumentMetadataSummary } from "../../Util";

export default function IdentityCards(props: { instruments?: InstrumentMetadataSummary[] }) {
  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
          {props.instruments.length ===0 &&
            <span style={{color:"white"}}>No SBT contents have been shared with this user.</span>
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
      </div>
    </>
  );
}
