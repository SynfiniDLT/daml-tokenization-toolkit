import { AccountOpenOfferSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AccountOfferDetails from "./accountOfferDetails";

export default function AccountOffers(props: { accountOffers?: AccountOpenOfferSummary[]}) {
  return (
    <div style={{ margin: "10px", padding: "10px" }}>
      {
        props.accountOffers !== undefined &&
        props.accountOffers.map(accountOffer =>
          <div key={accountOffer.cid}>
            <AccountOfferDetails accountOffer={accountOffer} />
          </div>
        )
      }
    </div>
  );
}
