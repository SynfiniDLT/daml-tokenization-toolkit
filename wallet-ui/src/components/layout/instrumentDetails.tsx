import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import styled from "styled-components";

interface InstrumentDetailsProps {
  instrument: InstrumentSummary;
}

export default function instrumentDetails(props: InstrumentDetailsProps) {

  let entity: any = props.instrument.pbaView?.attributes.entriesArray();

  const InstrumentDetailsContainer = styled.div`
    border-radius: 12px;
    margin: 5px;
    padding: 10px;
    background-color: #2a2b2f;
    box-shadow: 6.8px 13.6px 13.6px hsl(0deg 0% 0% / 0.29);
  `;


  return (
    <InstrumentDetailsContainer>
      <div key={props.instrument.cid}>
        <span>Instrument</span><br />
        <span>{props.instrument.pbaView?.instrument.id.unpack} | {props.instrument.pbaView?.instrument.version}</span> <br/>
        <span>Onwer</span><br />
        <span>{props.instrument.pbaView?.owner}</span><br />
        <span>Entity</span><br />
        <span>{Array.from(entity, ([key, value]) => `${key} | ${value}`)}</span>
      </div>
    </InstrumentDetailsContainer>
  );
}
