import InstrumentDetails from "./instrumentDetails";

export default function Instruments(props: { instruments?: any[] }) {
  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">SBT Contents</h4>
      </div>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
          {props.instruments.length ===0 &&
            <span style={{color:"white"}}>This user doesn't have any SBT contests.</span>
          }
            {props.instruments.map((instrument: any, index: number) => (
              <div key={index}>
                <h5 className="profile__title"></h5>
                <InstrumentDetails
                  instrument={instrument}
                  key={instrument}
                ></InstrumentDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
