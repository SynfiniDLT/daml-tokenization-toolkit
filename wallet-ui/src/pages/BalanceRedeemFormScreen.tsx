import React, { useContext, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLayout } from "../components/PageLayout";
import { useLocation } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { formatCurrency } from "../components/Util";

const BalanceRedeemFormScreen: React.FC = () => {
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const { user, isAuthenticated, isLoading } = useAuth0();
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}/wallet-views`;

  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [inputAmount, setInputAmount] = useState("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  
  const handleChangeAmount = (event: any) => {
    setInputAmount(formatCurrencyInput(event));
  };  
  
  const formatCurrencyInput = (event: any) => {
    let value = event.target.value.replace(/[^0-9.]/g, '').replace(/^0+/, '');
    return value;
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    console.log("submit");

      let referenceIdUUID = uuid();
      try {
        // let subscribeResponse = await ledger.createAndExercise(
          
        // );
        //setReferenceId(referenceIdUUID);
      } catch (e) {
        setError("Try caatch error: {" + e + "}");
      }
    
  }
  
  //console.log("state balance", state.balance)
  
  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Redeem Balance
      </h3>
      <form onSubmit={handleSubmit}>
      <p>Account: {state.balance.account.id.unpack}</p>
      <p>Instrument: {state.balance.instrument.id.unpack}</p>
      <p>Balance unlocked to redeem: {formatCurrency(state.balance.unlocked,'en-US')}</p>
      <p>
          <input type="string" id="amount"
              name="amount"
              value={inputAmount}
              onChange={handleChangeAmount}
              style={{ width: "200px" }}
              onInput={formatCurrencyInput}
            />
        </p>
        {parseFloat(state.balance.unlocked) >= parseFloat(inputAmount) && 
          <button
          type="submit"
          className={"button__login"}
          style={{ width: "200px" }}
          >
                Redeem
          </button>
        }
      </form>
    </PageLayout>
  );
};

export default BalanceRedeemFormScreen;
function uuid() {
  throw new Error("Function not implemented.");
}

