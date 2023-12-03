import FundDetails from "./fundDetails";

export default function Funds(props: { funds?: any[] }) {
  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">Funds</h4>
      </div>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.funds !== undefined && (
          <>
            {props.funds.map((fund: any, index: number) => (
              <div key={index}>
                <FundDetails fund={fund} key={fund.contractId}></FundDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
