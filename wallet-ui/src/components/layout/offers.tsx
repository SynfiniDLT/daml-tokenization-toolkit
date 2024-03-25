import { OneTimeOffer } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";
import OfferDetails from "./offerDetails";
import { CreateEvent } from "@daml/ledger";

export default function Offers(props: { offers?: CreateEvent<OneTimeOffer, undefined, string>[] }) {
  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.offers !== undefined && (
            <div id="assets-div">
              <div className="row">
                <div className="header-cell">Offer ID</div>
                <div className="header-cell">Offeree</div>
                <div className="header-cell">Offerers</div>
                <div className="header-cell">Description</div>
                <div className="header-cell">Quantity</div>
                <div className="header-cell">Actions</div>
              </div>
              {props.offers.map((offer, index) => (
                <OfferDetails offer={offer} key={index}/>
              ))}
            </div>
        )}
      </div>
    </>
  );
}
