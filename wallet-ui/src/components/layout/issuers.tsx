import { IssuerSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import IssuerDetails from "./issuerDetails";

export default function Issuers(props: { issuers?: IssuerSummary[] }) {
  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.issuers !== undefined && (
          <>
            {props.issuers.map((issuer: IssuerSummary, index: number) => (
              <div key={index}>
                <IssuerDetails issuer={issuer}/>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
