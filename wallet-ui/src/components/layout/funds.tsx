import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
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
            {props.funds.map((account: AccountSummary, index: number) => (
              <div key={index}>
                <FundDetails account={account} key={account.cid}></FundDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
