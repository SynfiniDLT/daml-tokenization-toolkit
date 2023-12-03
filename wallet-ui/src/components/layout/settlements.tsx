import { SettlementSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import SettlementDetails from "./settlementDetails";

export default function Settlements(props: { settlements?: SettlementSummary[] }) {
  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">Transactions</h4>
      </div>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.settlements !== undefined && (
          <>
            {props.settlements.map((settlement: SettlementSummary, index: number) => (
              <div key={index}>
                <SettlementDetails
                  settlement={settlement}
                  key={settlement.batchCid}
                ></SettlementDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
