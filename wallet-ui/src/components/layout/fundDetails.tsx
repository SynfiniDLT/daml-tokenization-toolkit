import { useNavigate } from "react-router-dom";
import { CardContainer, ContainerColumn, ContainerColumnKey, ContainerDiv, ContainerColumnValue } from "./general.styled";
import { formatCurrency, formatPercentage, nameFromParty } from "../Util";
import { CreateEvent } from "@daml/ledger";
import { FundOffer } from "@daml.js/fund-tokenization/lib/Synfini/Fund/Offer";
import { Coin } from "react-bootstrap-icons";

interface FundDetailsProps {
  fund: CreateEvent<FundOffer, undefined, string>;
}

export default function FundDetails(props: FundDetailsProps) {
  const nav = useNavigate();

  const handleClick = (fund: any) => {
    nav("/fund/subscribe", { state: { fund: fund } });
  };

  return (
    <CardContainer>
      <ContainerDiv>
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
          <ContainerColumnValue>{props.fund.payload.unitsInstrument.issuer}</ContainerColumnValue>
          <ContainerColumnValue>{props.fund.payload.fundManager}</ContainerColumnValue>
          <ContainerColumnValue>
            {props.fund.payload.costPerUnit} {props.fund.payload.paymentInstrument.id.unpack} <Coin />
          </ContainerColumnValue>
          <ContainerColumnValue>{formatCurrency(props.fund.payload.minInvesment, "en-US")}</ContainerColumnValue>
          <ContainerColumnValue>{formatPercentage(props.fund.payload.commission)}</ContainerColumnValue>
        </ContainerColumn>
      </ContainerDiv>
    </CardContainer>
  );
}
