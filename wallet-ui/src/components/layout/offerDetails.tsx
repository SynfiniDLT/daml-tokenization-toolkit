import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import HoverPopUp from "./hoverPopUp";
import AuthContextStore from "../../store/AuthContextStore";

interface IssuerDetailsProps {
  offer: any;
}

export default function OfferDetails(props: IssuerDetailsProps) {
  const nav = useNavigate();
  const ctx = useContext(AuthContextStore);

  const handleAcceptOffer = (offer: any) => {
    nav("/offer/accept", { state: { offer: offer } });
  }


  let offerersArray: any = props.offer.payload.offerers.map.entriesArray();
  let offerers_arr: any = [];
  for (let index = 0; index < offerersArray.length; index++) {
    const el = offerersArray[index];
    offerers_arr.push(el[0]);
  }

  return (
    <div className="row" key={props.offer.payload.offerId.unpack}>
      <div className="cell">{props.offer.payload.offerId.unpack}</div>
      <div className="cell">
        <HoverPopUp triggerText={props.offer.payload.offeree.substring(0, 30) + "..."} popUpContent={props.offer.payload.offeree} />
      </div>
      <div className="cell">
        {offerers_arr.map((element: any, index: React.Key) => (
          <>
            <HoverPopUp triggerText={element.substring(0, 30) + "..."} popUpContent={element} key={index} /> <br />
          </>
        ))}
      </div>
      <div className="cell">
        {props.offer.payload.offeree === ctx.primaryParty && (
          <button onClick={() => handleAcceptOffer(props.offer)}>Accept Offer</button>
        )}
      </div>
    </div>
  );
}