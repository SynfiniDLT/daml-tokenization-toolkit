import { useNavigate } from "react-router-dom";
import { QuestionCircle } from "react-bootstrap-icons";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { CardContainer } from "./general.styled";

interface AccountDetailsProps {
  account: AccountSummary;
}

export default function FundDetails(props: AccountDetailsProps) {
  const nav = useNavigate();
  


  const handleClick = (account: AccountSummary) => {
    if (account.view.id.unpack==='sbt'){
      nav("/wallet/account/balance/sbt", { state: { account: account } });
    }else{
      nav("/wallet/account/balance/", { state: { account: account } });
    }
  };

  return (
    <CardContainer>
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
    </CardContainer>
  );
}


