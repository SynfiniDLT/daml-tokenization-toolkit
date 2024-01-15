import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { nameFromParty } from "../Util";
import HoverPopUp from "./hoverPopUp";
import {
  CardContainer,
  ContainerColumn,
  ContainerColumnKey,
  ContainerColumnValue,
  ContainerDiv,
} from "./general.styled";

interface AccountDetailsProps {
  account: AccountSummary;
}

export default function AccountDetails(props: AccountDetailsProps) {
  const nav = useNavigate();

  const AccountDetailsContainer = styled.div`
    border-radius: 12px;
    margin: 5px;
    padding: 10px;
    cursor: pointer;
    background-color: #2a2b2f;
    box-shadow: inset 0 0 0.5px 1px hsla(0, 0%, 100%, 0.075), 0 0 0 1px hsla(0, 0%, 0%, 0.05),
      0 0.3px 0.4px hsla(0, 0%, 0%, 0.02), 0 0.9px 1.5px hsla(0, 0%, 0%, 0.045), 0 3.5px 6px hsla(0, 0%, 0%, 0.09);
  `;

  const handleClick = (account: AccountSummary) => {
    if (account.view.id.unpack === "sbt") {
      nav("/wallet/account/balance/sbt", { state: { account: account } });
    } else {
      nav("/wallet/account/balance/", { state: { account: account } });
    }
  };

  return (
    <CardContainer>
      <ContainerDiv>
        <ContainerColumn>
          <ContainerColumnKey>Description:</ContainerColumnKey>
          <ContainerColumnKey>Validator:</ContainerColumnKey>
          <ContainerColumnKey>Contract ID:</ContainerColumnKey>
          <p></p>
          <p>
            <button onClick={() => handleClick(props.account)}>See Balance</button>
          </p>
        </ContainerColumn>
        <ContainerColumn>
          <ContainerColumnValue>{props.account.view.description}</ContainerColumnValue>
          <ContainerColumnValue>
            <HoverPopUp
              customLeft="450%"
              triggerText={nameFromParty(props.account.view.custodian)}
              popUpContent={props.account.view.custodian}
            />
          </ContainerColumnValue>
          <ContainerColumnValue><HoverPopUp triggerText={props.account.cid.substring(0, 30)} popUpContent={props.account.cid} />...</ContainerColumnValue>
        </ContainerColumn>
      </ContainerDiv>
    </CardContainer>
  );
}

export function AccountDetailsSimple(props: AccountDetailsProps) {
  const nav = useNavigate();
  

  const handleClick = (account: AccountSummary) => {
    nav("/wallet");
  };

  return (
    <CardContainer pointer style={{width: "40%"}}>
      <ContainerDiv onClick={() => handleClick(props.account)} key={props.account.cid}>
        <ContainerColumn>
          <ContainerColumnKey>Account ID:</ContainerColumnKey>
          <ContainerColumnKey>Description:</ContainerColumnKey>
          <ContainerColumnKey>Contract ID:</ContainerColumnKey>
        </ContainerColumn>
        <ContainerColumn>
          <ContainerColumnValue>{props.account.view.id.unpack}</ContainerColumnValue>
          <ContainerColumnValue>{props.account.view.description}</ContainerColumnValue>
          <ContainerColumnValue><HoverPopUp triggerText={props.account.cid.substring(0, 30)} popUpContent={props.account.cid} />...</ContainerColumnValue>
        </ContainerColumn>
      </ContainerDiv>
    </CardContainer>
  );
}
