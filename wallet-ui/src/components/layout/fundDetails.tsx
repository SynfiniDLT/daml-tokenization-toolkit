import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CardContainer, ContainerColumn, ContainerColumnKey, ContainerDiv, ContainerColumnValue } from "./general.styled";
import { formatCurrency, formatPercentage } from "../Util";
import { CreateEvent } from "@daml/ledger";
import { FundOffer } from "@daml.js/fund-tokenization/lib/Synfini/Fund/Offer";
import { Coin } from "react-bootstrap-icons";

interface FundDetailsProps {
  fund: CreateEvent<FundOffer, undefined, string>;
}

export default function FundDetails(props: FundDetailsProps) {
  const nav = useNavigate();
  const location = useLocation();

  const handleClick = (fund: any) => {
    nav("/fund/subscribe", { state: { fund: fund } });
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
          behavior: 'smooth',
        });
      }
    }
  }, [location]);

  return (
    <CardContainer>
      <ContainerDiv id={props.fund.payload.fundManager}>
        <ContainerColumn>
          <ContainerColumnKey>Issuer:</ContainerColumnKey>
          <ContainerColumnKey>Fund Manager:</ContainerColumnKey>
          <ContainerColumnKey>Cost Per Unit:</ContainerColumnKey>
          <ContainerColumnKey>Minimal Investment:</ContainerColumnKey>
          <ContainerColumnKey>Commission:</ContainerColumnKey>
          <p>
            <br />
          </p>
          <button
            type="button"
            className="button__login"
            style={{ width: "100px" }}
            onClick={() => handleClick(props.fund)}
          >
            Subscribe
          </button>
        </ContainerColumn>
        <ContainerColumn>
          <ContainerColumnValue>
            <a href={`http://${window.location.host}/directory#${props.fund.payload.unitsInstrument.issuer}`} style={{color: "#7B68EE", textDecoration: "underline"}}>
              {props.fund.payload.unitsInstrument.issuer}
            </a>
          </ContainerColumnValue>
          <ContainerColumnValue>
            <a href={`http://${window.location.host}/directory#${props.fund.payload.fundManager}`} style={{color: "#7B68EE", textDecoration: "underline"}}>
            {props.fund.payload.fundManager}
            </a>
          </ContainerColumnValue>
          <ContainerColumnValue>
            {props.fund.payload.costPerUnit} {props.fund.payload.paymentInstrument.id.unpack} <Coin />
          </ContainerColumnValue>
          <ContainerColumnValue>{formatCurrency(props.fund.payload.minInvesment, "en-US")} {props.fund.payload.paymentInstrument.id.unpack} <Coin /></ContainerColumnValue>
          <ContainerColumnValue>{formatPercentage(props.fund.payload.commission)}</ContainerColumnValue>
        </ContainerColumn>
      </ContainerDiv>
    </CardContainer>
  );
}
