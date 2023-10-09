import React, { useState } from "react";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import * as damlTypes from "@daml/types";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { PlusCircleFill, DashCircleFill } from "react-bootstrap-icons";

interface InstrumentDetailsProps {
  instrument: InstrumentSummary;
}

export default function instrumentDetails(props: InstrumentDetailsProps) {


  const InstrumentDetailsContainer = styled.div`
    border-radius: 12px;
    margin: 5px;
    padding: 10px;
    background-color: #2a2b2f;
    box-shadow: 6.8px 13.6px 13.6px hsl(0deg 0% 0% / 0.29);
  `;

  const ContainerFieldValue = styled.div`
    display: flex;
    flex-wrap: wrap; /* Allows content to wrap to the next line if necessary */
  `;

  const Field = styled.span`
    padding: 10px;
    font-weight: 700;
  `;

  const Value = styled.div`
    padding: 10px;
  `;

  const FieldSettled = styled.span`
    color: green;
  `;

  const FieldPending = styled.span`
    color: yellow;
  `;

  const toDateTimeString = (inputDate: damlTypes.Time) => {
    return new Date(inputDate).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  return (
    <InstrumentDetailsContainer>
      {/* <div key={props.instrument.pbtView?.description}>
        <span>Depository: {props.instrument.pbtView?.instrument.depository}</span>
        <span>Issuer: {props.instrument.pbtView?.instrument.issuer}</span>  
        <span>{props.instrument.pbtView?.instrument.id.unpack}</span>


      </div> */}
    </InstrumentDetailsContainer>
  );
}
