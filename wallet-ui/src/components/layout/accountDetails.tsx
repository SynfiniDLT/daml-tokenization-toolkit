import { useNavigate } from "react-router-dom";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { nameFromParty } from "../../Util";
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
          <ContainerColumnKey>Provider:</ContainerColumnKey>
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
  

  const handleClick = () => {
    nav("/wallet");
  };

  return (
    <CardContainer pointer style={{width: "50%"}}>
      <ContainerDiv onClick={() => handleClick()} key={props.account.cid}>
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
