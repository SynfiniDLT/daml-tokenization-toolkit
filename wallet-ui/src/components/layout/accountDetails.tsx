import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { QuestionCircle } from "react-bootstrap-icons";

interface AccountDetailsProps {
  account: {
    cid: string;
    view: {
      id: {
        unpack: string;
      };
      description: string;
      custodian: string;
    };
  };
}

export default function AccountDetails(props: AccountDetailsProps) {
  const nav = useNavigate();
  
  const AccountDetailsContainer = styled.div`
    border-radius: 12px;
    margin: 5px;
    padding: 10px;
    cursor: pointer;
    background-color: #2a2b2f;
    box-shadow: inset 0 0 0.5px 1px hsla(0, 0%, 100%, 0.075),
      0 0 0 1px hsla(0, 0%, 0%, 0.05), 0 0.3px 0.4px hsla(0, 0%, 0%, 0.02),
      0 0.9px 1.5px hsla(0, 0%, 0%, 0.045), 0 3.5px 6px hsla(0, 0%, 0%, 0.09);
  `;

  const handleClick = (account: any) => {
    nav("/wallet/account/balance/", { state: { account: account } });
  };

  return (
    <AccountDetailsContainer>
      <div onClick={() => handleClick(props.account)} key={props.account.cid}>
        <p>Id: {props.account.view.id.unpack}</p>
        <p>Description: {props.account.view.description}</p>
        <div className="tooltip">
            Custodian:
            <QuestionCircle />
            <span className="tooltiptext">Custodian is responsible to look after digital assets on behalf of an investor or client.</span>
        </div>
          <br /> {props.account.view.custodian}
        <p>
          <br/>
          Contract ID:
          <br />
          {props.account.cid.substring(0, 30)}...
        </p>
      </div>
    </AccountDetailsContainer>
  );
}

export function AccountDetailsSimple(props: AccountDetailsProps) {
  const nav = useNavigate();
  const AccountDetailsContainer = styled.div`
    border-radius: 12px;
    margin: 5px;
    padding: 10px;
    cursor: pointer;
    background-color: #2a2b2f;
    box-shadow: inset 0 0 0.5px 1px hsla(0, 0%, 100%, 0.075),
      0 0 0 1px hsla(0, 0%, 0%, 0.05), 0 0.3px 0.4px hsla(0, 0%, 0%, 0.02),
      0 0.9px 1.5px hsla(0, 0%, 0%, 0.045), 0 3.5px 6px hsla(0, 0%, 0%, 0.09);
  `;

  const handleClick = (account: any) => {
    nav("/wallet");
  };

  return (
    <AccountDetailsContainer>
      <div onClick={() => handleClick(props.account)} key={props.account.cid}>
        <p>Id: {props.account.view.id.unpack}</p>
        <p>
          Contract ID:
          <br />
          {props.account.cid.substring(0, 30)}...
        </p>
      </div>
    </AccountDetailsContainer>
  );
}
