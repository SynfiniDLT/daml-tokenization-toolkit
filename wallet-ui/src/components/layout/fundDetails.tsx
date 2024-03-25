import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CardContainer, ContainerColumn, ContainerColumnKey, ContainerDiv, ContainerColumnValue } from "./general.styled";
import { CreateEvent } from "@daml/ledger";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer"

interface FundDetailsProps {
  fund: CreateEvent<SettlementOpenOffer, undefined, string>;
}

export default function FundDetails(props: FundDetailsProps) {
  const nav = useNavigate();
  const location = useLocation();
  console.log("FundDetailsProps:", props);

  const handleClick = (fund: CreateEvent<SettlementOpenOffer, undefined, string>) => {
    nav("/fund/subscribe", { state: { fund: fund } });
  };

  useEffect(() => {
    const { hash } = location;
    if (hash) {
      const targetElement = document.getElementById(hash.slice(1));
      if (targetElement) {
        const offset = -100;
        const topPosition = targetElement.offsetTop + offset;
        window.scrollTo({
          top: topPosition,
          behavior: 'smooth',
        });
      }
    }
  }, [location]);

  return (
    <CardContainer pointer>
      <ContainerDiv id={props.fund.contractId}>
        <ContainerColumn>
          <ContainerColumnKey>Offered by:</ContainerColumnKey>
          <ContainerColumnKey>Description:</ContainerColumnKey>
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
          <ContainerColumnValue>
            {props.fund.payload.offerers.map.entriesArray().map(entry =>
              <a href={`http://${window.location.host}/directory#${entry[0]}`} style={{color: "#7B68EE", textDecoration: "underline"}}>
                {entry[0]}
              </a>)}
          </ContainerColumnValue>
          <ContainerColumnValue>
            {props.fund.payload.offerDescription}
          </ContainerColumnValue>
        </ContainerColumn>
      </ContainerDiv>
    </CardContainer>
  );
}
