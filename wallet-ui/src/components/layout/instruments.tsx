import InstrumentDetails from "./instrumentDetails";

export default function Instruments(props: { instruments?: any[] }) {
  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">SBT</h4>
      </div>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
            {props.instruments.map((instrument: any, index: number) => (
              <div key={index}>
                <h5 className="profile__title">Transaction {index+1}</h5>
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
