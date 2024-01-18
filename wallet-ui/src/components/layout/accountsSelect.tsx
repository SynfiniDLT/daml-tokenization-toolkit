import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";


interface AccountsSelectProps {
  accounts?: AccountSummary[];
  onChange: (event: any) => void;
  selectedAccount: string;
}

export default function AccountsSelect(props: AccountsSelectProps) {
  return (
      <div>
        {props.accounts !== undefined && (
          <select name="accountSelect" onChange={props.onChange} value={props.selectedAccount} required>
              <option value="" defaultValue="">Select one account</option>
            {props.accounts.map((account: AccountSummary, index: number) => (
              <option value={account.cid} key={account.cid}>{account.view.description}</option>
            ))}
          </select>
        )}
      </div>
  );
}
