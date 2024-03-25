import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";

interface AccountsSelectProps {
  accounts?: AccountSummary[];
  onChange:React.ChangeEventHandler<HTMLSelectElement>;
  selectedAccount: string;
}

export default function AccountsSelect(props: AccountsSelectProps) {
  return (
      <div>
        {props.accounts !== undefined && (
          <select name="accountSelect" onChange={props.onChange} value={props.selectedAccount}>
              <option value="" defaultValue="">Select one account</option>
            {props.accounts.map(account => (
              <option value={`${account.view.custodian}@${account.view.id.unpack}`} key={account.cid}>{account.view.description}</option>
            ))}
          </select>
        )}
      </div>
  );
}
