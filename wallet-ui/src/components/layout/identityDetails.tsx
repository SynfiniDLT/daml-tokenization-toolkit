import { Attribute } from "@daml.js/synfini-instrument-metadata-interface/lib/Synfini/Interface/Instrument/Metadata/Metadata";
import styled from "styled-components";
import { Field } from "./general.styled";
import { InstrumentMetadataSummary } from "../../Util";

interface IdentityDetailsProps {
  instrument: InstrumentMetadataSummary;
}

// TODO consider if we need to change the way attribute values are displayed based on their display type
function displayValue(attribute: Attribute) {
  return attribute.attributeValue;
}

export default function identityDetails(props: IdentityDetailsProps) {
  const entity: [string, Attribute][] = props.instrument.metadata.view.attributes.entriesArray();

  const IdentityDetailsContainer = styled.div`
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
    <IdentityDetailsContainer>
      <div key={props.instrument.instrument.cid} id={props.instrument.instrument.tokenView?.token.instrument.id.unpack}>
        <Field>Asset attributes</Field>
        <br />
        <FieldValue>{entity.map(([key, value]) => <p>{key}{displayValue(value)}</p>)}</FieldValue>
        <br />
        <br />
        <Field>Issuer</Field>
        <br />
        <FieldValue>{props.instrument.metadata.view.instrument.issuer}</FieldValue>
        <br />
        <br />
        <Field>Asset ID</Field>
        <br />
        <FieldValue>{props.instrument.metadata.view.instrument.id.unpack} (variant: {props.instrument.metadata.view.instrument.version})</FieldValue>
      </div>
    </IdentityDetailsContainer>
  );
}
