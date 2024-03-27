import { CreateEvent } from "@daml/ledger";
import FundDetails from "./fundDetails";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer";

export default function Funds(props: { funds?: CreateEvent<SettlementOpenOffer, undefined, string>[] }) {
  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.funds !== undefined && (
          <>
            {props.funds.map((fund: CreateEvent<SettlementOpenOffer, undefined, string>, index: number) => (
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
