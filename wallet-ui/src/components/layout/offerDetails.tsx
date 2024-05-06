import { useNavigate } from "react-router-dom";
import HoverPopUp from "./hoverPopUp";
import { CreateEvent } from "@daml/ledger";
import { OneTimeOffer } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";

interface IssuerDetailsProps {
  offer: CreateEvent<OneTimeOffer, undefined, string>;
}

export default function OfferDetails(props: IssuerDetailsProps) {
  const nav = useNavigate();

  const handleClickOfferID = () => {
    nav("/offer/accept", { state: { offer: props.offer } });
  };

  const offerersArray = props.offer.payload.offerers.map.entriesArray().map(kv => kv[0]);

  return (
    <>
      {props.offer !== undefined && (
        <tr>
          <td>
            <a onClick={_ => handleClickOfferID()}>
              {props.offer.payload.offerId.unpack}
            </a>
          </td>
          <td>
            {offerersArray.map(offerer => (
              <div key={offerer}>
                <HoverPopUp triggerText={offerer.substring(0, 40) + "..."} popUpContent={offerer} /> <br />
              </div>
            ))}
          </td>
          <td>{props.offer.payload.offerDescription}</td>
        </tr>
      )}
    </>
  );
}
