import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import {
  CardContainer,
  ContainerDiv,
  ContainerColumn,
  ContainerColumnKey,
  ContainerColumnValue,
} from "./general.styled";
import { toDateTimeString } from "../Util";
import { BoxArrowUpRight } from "react-bootstrap-icons";

interface InstrumentDetailsProps {
  instrument: InstrumentSummary;
}

export default function instrumentTokenDetails(props: InstrumentDetailsProps) {
  let json_description;

  if (props.instrument.tokenView !== undefined && props.instrument.tokenView?.token.description !== undefined) {
    const description = props.instrument.tokenView?.token.description;
    json_description = JSON.parse(description);
  }

  return (
    <CardContainer>
      {props.instrument.tokenView !== null && (
        <ContainerDiv id={props.instrument.tokenView?.token.instrument.id.unpack}>
          <ContainerColumn>
            <ContainerColumnKey>Asset Name:</ContainerColumnKey>
            <ContainerColumnKey>Tranche ID(UUID):</ContainerColumnKey>
            <ContainerColumnKey>IPFS url:</ContainerColumnKey>
            <ContainerColumnKey>Upper Limit</ContainerColumnKey>
            <ContainerColumnKey >Creation Date (dd/mm/yyyy HH:MM:ss:sss)</ContainerColumnKey>
          </ContainerColumn>

          <ContainerColumn>
            <ContainerColumnValue>{props.instrument.tokenView?.token.instrument.id.unpack}</ContainerColumnValue>
            <ContainerColumnValue>{props.instrument.tokenView?.token.instrument.version}</ContainerColumnValue>
            <ContainerColumnValue><a href={`http://${json_description.ipfs}`} style={{color: "#66FF99", textDecoration: "underline"}} target="_blank">
            {json_description.ipfs} {"    "}<BoxArrowUpRight />
                </a></ContainerColumnValue>
            

            <ContainerColumnValue>{json_description.upperLimit}</ContainerColumnValue>
            <ContainerColumnValue>{toDateTimeString(props.instrument.tokenView?.token.validAsOf)}</ContainerColumnValue>
          </ContainerColumn>
        </ContainerDiv>
      )}
    </CardContainer>
  );
}
