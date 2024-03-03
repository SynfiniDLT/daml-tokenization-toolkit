import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AccountDetails from "./accountDetails";

export default function Accounts(props: { accounts?: AccountSummary[] }) {
  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.accounts !== undefined && (
          <>
            {props.accounts.map((account: AccountSummary, index: number) => (
              <div key={index}>
                <h5 className="profile__title">Account {index + 1}</h5> 
                <AccountDetails account={account} key={account.cid}></AccountDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
