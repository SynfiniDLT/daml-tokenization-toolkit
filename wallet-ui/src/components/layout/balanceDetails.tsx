import styled from "styled-components";
import { QuestionCircle } from "react-bootstrap-icons";
import { Balance } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
interface BalanceDetailsProps {
  balance: Balance
}

export default function BalanceDetails(props: BalanceDetailsProps) {
  const BalanceDetailsContainer = styled.div`
    border-radius: 12px;
    border-style: solid;
    margin: 5px;
    padding: 20px;
    width: 60%;
  `;


  // TODO add locked/unlocked balance display as per business requirements
  return (
    <BalanceDetailsContainer>
      <div>
        <p>Balance: {props.balance.unlocked}</p>
        <div>
          <h5 className="profile__title">Instrument</h5>
          Id: {props.balance.instrument.id.unpack} | version:{" "}
          {props.balance.instrument.version}
          <p/>
          <p>
            Depository:
            <br />
            {props.balance.instrument.depository}
          </p>
          <p>
            Issuer:
            <br />
            {props.balance.instrument.issuer}
          </p>
          <p></p>
        </div>
      </div>


    </BalanceDetailsContainer>
  );
}
