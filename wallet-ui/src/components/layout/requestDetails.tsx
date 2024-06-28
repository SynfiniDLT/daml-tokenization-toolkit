// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useNavigate } from "react-router-dom";
import HoverPopUp from "./hoverPopUp";
import { CreateEvent } from "@daml/ledger";
import { OneTimeOffer } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";
import { setToArray } from "../../Util";

interface RequestDetailsProps {
  offer: CreateEvent<OneTimeOffer, undefined, string>;
}

export default function RequestDetails(props: RequestDetailsProps) {
  const nav = useNavigate();

  const handleClickOfferID = () => {
    nav("/request/accept", { state: { offer: props.offer } });
  };

  return (
    <tr>
      <td>
        <a onClick={_ => handleClickOfferID()}>
          {props.offer.payload.offerId.unpack}
        </a>
      </td>
      <td>
        {
          setToArray(props.offer.payload.offerers).map(offerer =>
            <div key={offerer}>
              <HoverPopUp triggerText={offerer.substring(0, 40) + "..."} popUpContent={offerer} /> <br />
            </div>
          )
        }
      </td>
      <td>{props.offer.payload.offerDescription}</td>
    </tr>
  );
}
