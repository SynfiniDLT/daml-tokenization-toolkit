// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CardContainer, ContainerColumn, ContainerColumnKey, ContainerDiv, ContainerColumnValue } from "./general.styled";
import { CreateEvent } from "@daml/ledger";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer"
import { setToArray, truncateParty } from "../../Util";

interface OfferDetailsProps {
  offer: CreateEvent<SettlementOpenOffer, undefined, string>;
}

export default function OfferDetails(props: OfferDetailsProps) {
  const nav = useNavigate();
  const location = useLocation();

  const handleClick = (offer: CreateEvent<SettlementOpenOffer, undefined, string>) => {
    nav("/offer/accept", { state: { offer: offer } });
  };

  useEffect(() => {
    const { hash } = location;
    if (hash) {
      const targetElement = document.getElementById(hash.slice(1));
      if (targetElement) {
        const offset = -100;
        const topPosition = targetElement.offsetTop + offset;
        window.scrollTo({
          top: topPosition,
          behavior: "smooth",
        });
      }
    }
  }, [location]);

  const settlersArray = setToArray(props.offer.payload.settlers);
  const settlers = settlersArray
    .map((e, index) =>
      (index > 0 ? ", " : "") +
      (settlersArray.length > 1 && index >= settlersArray.length - 1 ? "or " : "")  +
      (e.tag === "TakerEntity" ? "Offer taker" : truncateParty(e.value))
    )
    .join(", ");

  return (
    <CardContainer pointer>
      <h4 className="profile__title">{props.offer.payload.offerDescription}</h4>
      <ContainerDiv id={props.offer.contractId}>
        <ContainerColumn>
          <ContainerColumnKey>Offered by:</ContainerColumnKey>
          <ContainerColumnKey>Settled by:</ContainerColumnKey>
          <p>
            <br />
          </p>
          <button
            type="button"
            className="button__login"
            style={{ width: "100px" }}
            onClick={() => handleClick(props.offer)}
          >
            Details
          </button>
        </ContainerColumn>
        <ContainerColumn>
          <ContainerColumnValue>
            {setToArray(props.offer.payload.offerers).map(truncateParty).join(", ")}
          </ContainerColumnValue>
          <ContainerColumnValue>
            {settlers}
          </ContainerColumnValue>
        </ContainerColumn>
      </ContainerDiv>
    </CardContainer>
  );
}
