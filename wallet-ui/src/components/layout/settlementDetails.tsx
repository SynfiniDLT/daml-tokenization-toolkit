import React, { useState } from "react";
import { SettlementStep, SettlementSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import * as damlTypes from "@daml/types";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { PlusCircleFill, DashCircleFill } from "react-bootstrap-icons";

interface SettlementDetailsProps {
  settlement: SettlementSummary;
}

export default function SettlementDetails(props: SettlementDetailsProps) {
  const [toggle, setToggle] = useState(false);

  const setToggleCol = () => {
    setToggle((prev) => {
      return !prev;
    });
  };

  const SettlementDetailsContainer = styled.div`
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

  // TODO may need to adjust formatting of `step.routedStep.quantity.amount`?
  return (
    <SettlementDetailsContainer>
      <div key={props.settlement.batchCid}>
        <div>
          <Field>Batch ID:</Field>
          {props.settlement.batchId.unpack} |<Field> Description:</Field>
          {props.settlement.description} <br />
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
          {props.settlement.execution !== null && <>| Offset: </>}
          {props.settlement.execution !== null &&
            props.settlement.execution.offset}
        </div>

        <hr></hr>
        {props.settlement.steps.map((step: SettlementStep, index: number) => (
          <div key={index}>
            <h5 className="profile__title">Step {index + 1}</h5>
            <div style={{ margin: "15px" }}>
              <Field>Sender: </Field>
              {step.routedStep.sender.substring(0, 30)}...
              <br />
              <Field>Receiver: </Field>
              {step.routedStep.receiver.substring(0, 30)}...
              <br />
              <Field>Custodian: </Field>
              {step.routedStep.custodian.substring(0, 30)}...
              <br />
              <Field>Amount: </Field>
              {step.routedStep.quantity.amount}
              <br />
              <div
                onClick={setToggleCol}
                id={step.routedStep.quantity.unit.id.unpack}
                key={step.instructionCid}
              >
                <Field>Instrument:</Field>{step.routedStep.quantity.unit.id.unpack}
                <Field>Version:</Field>{step.routedStep.quantity.unit.version} <br />
                {toggle ? <DashCircleFill /> : <PlusCircleFill />}
              </div>
              <div
                className="settlement-content"
                style={{ height: toggle ? "60px" : "0px" }}
                key={step.routedStep.quantity.unit.id.unpack}
              >
                Depository: {step.routedStep.quantity.unit.depository}
                <br />
                Issuer: {step.routedStep.quantity.unit.issuer}
              </div>
              <hr></hr>
            </div>
          </div>
        ))}
      </div>
    </SettlementDetailsContainer>
  );
}
