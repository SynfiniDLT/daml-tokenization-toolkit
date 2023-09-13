import SettlementDetails from "./settlementDetails";

export default function Settlements(props: { settlements?: any[] }) {
  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">Transactions</h4>
      </div>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.settlements !== undefined && (
          <>
            {props.settlements.map((settlement: any, index: number) => (
              <div key={index}>
                <h5 className="profile__title">Transaction {index+1}</h5>
                <SettlementDetails
                  settlement={settlement}
                  key={settlement}
                ></SettlementDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
