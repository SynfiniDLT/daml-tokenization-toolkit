import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import styled from "styled-components";
import { Field } from "./general.styled";

interface InstrumentDetailsProps {
  instrument: InstrumentSummary;
}

export default function instrumentDetails(props: InstrumentDetailsProps) {
  let entity: [string, string][] = [];

  if (props.instrument.pbaView?.attributes.entriesArray()) {
    entity = props.instrument.pbaView?.attributes.entriesArray();
  }

  const InstrumentDetailsContainer = styled.div`
    border-radius: 12px;
    margin: 20px;
    padding: 20px;
    background-color: #2a2b2f;
    box-shadow: 6.8px 13.6px 13.6px hsl(0deg 0% 0% / 0.29);
  `;

  const FieldValue = styled.span`
    padding: 15px;
  `;

  return (
    <InstrumentDetailsContainer>
      <div key={props.instrument.cid} id={props.instrument.pbaView?.owner}>
        <Field>SBT Holder ID</Field>
        <br />
        <FieldValue>{props.instrument.pbaView?.owner}</FieldValue>
        <br />
        <br />
        <Field>SBT Holder Name</Field>
        <br />
        <FieldValue>{Array.from(entity, ([key, value]) => `${value}`)}</FieldValue>
        <br />
        <br />
        <Field>SBT Issuing Authority</Field>
        <br />
        <FieldValue>{props.instrument.pbaView?.instrument.issuer}</FieldValue>
      </div>
    </InstrumentDetailsContainer>
  );
}
