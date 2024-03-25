import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import HoverPopUp from "./hoverPopUp";
import AuthContextStore from "../../store/AuthContextStore";
import { CreateEvent } from "@daml/ledger";
import { OneTimeOffer } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";

interface IssuerDetailsProps {
  offer: CreateEvent<OneTimeOffer, undefined, string>;
}

export default function OfferDetails(props: IssuerDetailsProps) {
  const nav = useNavigate();
  const ctx = useContext(AuthContextStore);

  const handleAcceptOffer = (offer: CreateEvent<OneTimeOffer, undefined, string>) => {
    nav("/offer/accept", { state: { offer } });
  };

  const offerersArray = props.offer.payload.offerers.map.entriesArray().map(kv => kv[0]);

  return (
    <>
      {props.offer !== undefined && (
        <div className="row" key={props.offer.payload.offerId.unpack}>
          <div className="cell">{props.offer.payload.offerId.unpack.substring(0,20)+"..."}</div>
          <div className="cell">
            <HoverPopUp
              triggerText={props.offer.payload.offeree.substring(0, 20) + "..."}
              popUpContent={props.offer.payload.offeree}
            />
          </div>
          <div className="cell">
            {offerersArray.map((offerer, index: React.Key) => (
              <div key={index}>
                <HoverPopUp triggerText={offerer.substring(0, 20) + "..."} popUpContent={offerer} /> <br />
              </div>
            ))}
          </div>
          <div className="cell">{props.offer.payload.offerDescription}</div>
          <div className="cell">{props.offer.payload.maxQuantity}</div>
          <div className="cell">
            {props.offer.payload.offeree === ctx.primaryParty && (
              <button onClick={() => handleAcceptOffer(props.offer)}>Accept Offer</button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
