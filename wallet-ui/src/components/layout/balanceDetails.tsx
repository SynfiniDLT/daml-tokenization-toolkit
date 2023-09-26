import styled from "styled-components";
import { QuestionCircle } from "react-bootstrap-icons";
interface BalanceDetailsProps {
  balance: {
    balance: number;
    instrument: {
      depository: string;
      issuer: string;
      id: {
        unpack: string;
      };
      version: number;
    };
  };
}

export default function BalanceDetails(props: BalanceDetailsProps) {
  const BalanceDetailsContainer = styled.div`
    border-radius: 12px;
    border-style: solid;
    margin: 5px;
    padding: 20px;
    width: 60%;
  `;


  return (
    <BalanceDetailsContainer>
      <div>
        <p>Balance: {props.balance.balance}</p>
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
