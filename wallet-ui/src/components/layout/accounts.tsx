import AccountDetails from "./accountDetails";

export default function Accounts(props: { accounts?: any[] }) {
  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">Accounts</h4>
      </div>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.accounts !== undefined && (
          <>
            {props.accounts.map((account: any, index: number) => (
              <div key={index}>
                <h5 className="profile__title">Account {index + 1}</h5> 
                <AccountDetails account={account} key={account}></AccountDetails>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
