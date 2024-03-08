import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import {
  CardContainer,
  ContainerDiv,
  ContainerColumn,
  ContainerColumnKey,
  ContainerColumnValue,
  ContainerColumnField,
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
            <ContainerColumnField>Product Type:</ContainerColumnField>
            <ContainerColumnField>Product Version:</ContainerColumnField>
            <ContainerColumnKey>Certificate ID(UUID):</ContainerColumnKey>
            <ContainerColumnKey>IPFS url:</ContainerColumnKey>
            <ContainerColumnKey>Certificate Quantity:</ContainerColumnKey>
            <ContainerColumnKey>Price:</ContainerColumnKey>
            <ContainerColumnKey>Creation Date (dd/mm/yyyy HH:MM:ss:sss)</ContainerColumnKey>
          </ContainerColumn>

          <ContainerColumn>
            <ContainerColumnValue>
              {props.instrument.tokenView?.token.instrument.id.unpack.split("-")[0]}
            </ContainerColumnValue>
            <ContainerColumnValue>
              {props.instrument.tokenView?.token.instrument.id.unpack.split("-")[1]}
            </ContainerColumnValue>
            <ContainerColumnValue>{props.instrument.tokenView?.token.instrument.version}</ContainerColumnValue>
            <ContainerColumnValue>
              <a
                href={`http://${json_description.ipfs}`}
                style={{ color: "#66FF99", textDecoration: "underline" }}
                target="_blank"
              >
                {json_description.ipfs} {"    "}
                <BoxArrowUpRight />
              </a>
            </ContainerColumnValue>

            <ContainerColumnValue>{json_description.certificateQuantity}</ContainerColumnValue>
            <ContainerColumnValue>{json_description.price}</ContainerColumnValue>
            <ContainerColumnValue>{toDateTimeString(props.instrument.tokenView?.token.validAsOf)}</ContainerColumnValue>
          </ContainerColumn>
        </ContainerDiv>
      )}
    </CardContainer>
  );
}
