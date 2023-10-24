import { useNavigate } from "react-router-dom";
import { CardContainer } from "./general.styled";
import { nameFromParty } from "../Util";
import { CreateEvent } from "@daml/ledger";
import { FundOffer } from "@daml.js/fund-tokenization/lib/Synfini/Fund/Offer";

interface FundDetailsProps {
  fund: CreateEvent<FundOffer, undefined, string>
}

export default function FundDetails(props: FundDetailsProps) {
  const nav = useNavigate();
  


  const handleClick = (fund: any) => {
    nav("/fund/subscribe", { state: { fund: fund } });
  };

  return (
    <CardContainer>
      <div>
        <p>Name: {nameFromParty(props.fund.payload.fund)}</p>
        <p>Fund Manager: {nameFromParty(props.fund.payload.fundManager)}</p>
        <p>Cost Per Unit: {props.fund.payload.costPerUnit} {props.fund.payload.paymentInstrument.id.unpack}</p>
        <p>Minimal Investment: {props.fund.payload.minInvesment}</p>
        <p>Comission: {props.fund.payload.commission}</p>
        <button
              type="button"
              className="button__login"
              style={{ width: "100px" }}
              onClick={() => handleClick(props.fund)}
            >
              Subscribe
            </button>
      </div>
    </CardContainer>
  );
}


