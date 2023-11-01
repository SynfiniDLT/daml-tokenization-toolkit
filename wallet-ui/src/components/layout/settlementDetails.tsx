import React, { useState } from "react";
import { SettlementStep, SettlementSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { formatCurrency, nameFromParty, toDateTimeString } from "../Util";
import { PlusCircleFill, DashCircleFill, Clipboard, ClipboardCheck } from "react-bootstrap-icons";
import styled from "styled-components";
import { Field, FieldPending, FieldSettled } from "./general.styled";

interface SettlementDetailsProps {
  settlement: SettlementSummary;
}

export default function SettlementDetails(props: SettlementDetailsProps) {
  const [toggleSteps, setToggleSteps] = useState(false);
  const [toggleClipboard, setToggleClipboard] = useState(false);

  const setToggleCol = () => {
    setToggleSteps((prev) => {
      return !prev;
    });
  };

  const copyContentClipboard = (batchId: string) => {
    navigator.clipboard.writeText(batchId)
    setToggleClipboard(!toggleClipboard);
  }

  const SettlementDetailsContainer = styled.div`
    border-radius: 12px;
    margin: 5px;
    padding: 10px;
    background-color: #2a2b2f;
    box-shadow: 6.8px 13.6px 13.6px hsl(0deg 0% 0% / 0.29);
  `;


  return (
    <SettlementDetailsContainer>
      <div key={props.settlement.batchCid}>
        <div>
          <div onClick={() => copyContentClipboard(props.settlement.batchId.unpack)}>
            <Field>Transaction ID:</Field><span id="myInput">{props.settlement.batchId.unpack} </span>
            &nbsp; 
            {!toggleClipboard ? <Clipboard /> : <><ClipboardCheck /><span> copied!</span></>}
          </div>
          <br />
          <Field>Description:</Field>
          {props.settlement.description} 
          <br />
          <Field>Batch Status:</Field>
          {props.settlement.execution === null ? (
            <FieldPending>Pending</FieldPending>
          ) : (
            <FieldSettled>Settled</FieldSettled>
          )}
          <br />
          <Field>Created Time:</Field>
          {toDateTimeString(props.settlement.witness.effectiveTime)} | Offset:
          {props.settlement.witness.offset} <br />
          {props.settlement.execution !== null && (
            <>
              <Field>Settled Time:</Field>
            </>
          )}
          {props.settlement.execution !== null &&
            toDateTimeString(props.settlement.execution.effectiveTime)}
          {props.settlement.execution !== null && <> | Offset: </>}
          {props.settlement.execution !== null &&
            props.settlement.execution.offset}
        </div>

        <hr></hr>
        {props.settlement.steps.map((step: SettlementStep, index: number) => (
          <div key={index}>
            <h5 className="profile__title">Step {index + 1}</h5>
            <div style={{ margin: "15px" }}>
              <Field>Sender: </Field>
              {nameFromParty(step.routedStep.sender)}
              <br />
              <Field>Receiver: </Field>
              {nameFromParty(step.routedStep.receiver)}
              <br />
              <Field>Custodian: </Field>
              {nameFromParty(step.routedStep.custodian)}
              <br />
              <Field>Amount: </Field>
              {step.routedStep.quantity.unit.id.unpack === 'AUDN' ?
                <>
                  {formatCurrency(step.routedStep.quantity.amount, 'en-US')}
                </>
                :
                <>
                  {Number(step.routedStep.quantity.amount)}
                </>
              }
              <br />
              <div
                onClick={setToggleCol}
                id={step.routedStep.quantity.unit.id.unpack}
                key={step.instructionCid}
              >
                <Field>Instrument:</Field>{step.routedStep.quantity.unit.id.unpack}
                <Field>Version:</Field>{step.routedStep.quantity.unit.version} <br />
                {toggleSteps ? <DashCircleFill /> : <PlusCircleFill />}
              </div>
              <div
                className="settlement-content"
                style={{ height: toggleSteps ? "60px" : "0px" }}
                key={step.routedStep.quantity.unit.id.unpack}
              >
                Depository: {nameFromParty(step.routedStep.quantity.unit.depository)}
                <br />
                Issuer: {nameFromParty(step.routedStep.quantity.unit.issuer)}
              </div>
              <hr></hr>
            </div>
          </div>
        ))}
      </div>
    </SettlementDetailsContainer>
  );
}
