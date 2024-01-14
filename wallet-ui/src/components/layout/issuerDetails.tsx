import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CardContainer,
  ContainerColumn,
  ContainerColumnKey,
  ContainerColumnValue,
  ContainerDiv,
} from "./general.styled";
import { IssuerSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";

interface IssuerDetailsProps {
  issuer: IssuerSummary;
}

export default function IssuerDetails(props: IssuerDetailsProps) {
  const nav = useNavigate();
  const handleClick = (issuer: IssuerSummary) => {
    nav("/issuers/instrument/create", {state: {issuer: issuer}});
  };
  return (
    <>
      {props.issuer.token !== null && (
        <ContainerDiv id={props.issuer.token.cid}>
          <ContainerColumn>
            {/* <ContainerColumnKey>Depository:</ContainerColumnKey>
            <ContainerColumnKey>Issuer:</ContainerColumnKey> */}
            <button onClick={() => handleClick(props.issuer)}>Create Instrument</button>
          </ContainerColumn>

          {/* <ContainerColumn>
            <ContainerColumnValue>{props.issuer.token.view.depository}</ContainerColumnValue>
            <ContainerColumnValue>{props.issuer.token.view.issuer}</ContainerColumnValue>
          </ContainerColumn> */}
        </ContainerDiv>
      )}
    </>
  );
}
