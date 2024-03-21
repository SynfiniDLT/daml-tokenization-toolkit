import { useNavigate } from "react-router-dom";
import { ContainerColumn, ContainerDiv } from "./general.styled";
import { IssuerSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";

interface IssuerDetailsProps {
  issuer: IssuerSummary;
}

export default function IssuerDetails(props: IssuerDetailsProps) {
  const nav = useNavigate();
  const handleClick = (issuer: IssuerSummary) => {
    nav("/issuers/instrument/create", { state: { issuer: issuer } });
  };
  return (
    <>
      {props.issuer.token !== null && (
        <ContainerDiv id={props.issuer.token.cid}>
          <ContainerColumn>
            <button onClick={() => handleClick(props.issuer)}>Create environmental token</button>
          </ContainerColumn>
        </ContainerDiv>
      )}
    </>
  );
}
