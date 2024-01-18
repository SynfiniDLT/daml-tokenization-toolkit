import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import AuthContextStore from "../store/AuthContextStore";
import { userContext } from "../App";
import { WalletViewsClient } from "@synfini/wallet-views";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { PageLoader } from "../components/layout/page-loader";
import { useLocation } from "react-router-dom";
import AccountsSelect from "../components/layout/accountsSelect";
import {
  ContainerColumn,
  ContainerColumnField,
  ContainerDiv,
  DivBorderRoundContainer,
} from "../components/layout/general.styled";
import { AcceptOneTimeOffer } from "@daml.js/settlement-helpers/lib/Synfini/Settlement/Helpers";

export const OfferAcceptFormScreen: React.FC = () => {
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || "";
  const { state } = useLocation();
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();
  const [accounts, setAccounts] = useState<any>();
  const [transactionRefInput, setTransactionRefInput] = useState("");
  const [selectAccountInput, setSelectAccountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });
  const fetchAccounts = async () => {
    if (ctx.primaryParty !== "") {
      const respAcc = await walletClient.getAccounts({ owner: ctx.primaryParty });
      setAccounts(respAcc.accounts);
    }
  };

  const handleTransactionRef = (event: any) => {
    setTransactionRefInput(event.target.value);
  };

  const handleAccountChange = (event: any) => {
    console.log("selected", selectAccountInput);
    setSelectAccountInput(event.target.value);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    alert("submit");
    //await ledger.exerciseByKey(state.offer.payload.offerId,
  };

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchAccounts();
  }, []);

    console.log("off", state.offer)

  return (
    <PageLayout>
      <h3 className="profile__title">Accept Offer</h3>
      <DivBorderRoundContainer>
        <form onSubmit={handleSubmit}>
          <ContainerDiv style={{ height: "200px" }}>
            <ContainerColumn>
              <ContainerColumnField>Offer: </ContainerColumnField>
              <ContainerColumnField>Accounts: </ContainerColumnField>
              <ContainerColumnField>Transaction Reference: </ContainerColumnField>
              <p></p>
              <p></p>
              <button type="submit" className="button__login" disabled={isSubmitting}>
                Submit
              </button>
            </ContainerColumn>
            <ContainerColumn>
              <ContainerColumnField style={{ width: "600px" }}>
                {state.offer.payload.offerId.unpack}
              </ContainerColumnField>
              <ContainerColumnField style={{ width: "600px" }}>
                {/* <AccountsSelect accounts={accounts} onChange={handleAccountChange} selectedAccount={selectAccountInput} /> */}
              </ContainerColumnField>
              <ContainerColumnField>
                <input type="text" name="transactionRef" style={{ width: "300px" }} onChange={handleTransactionRef} required/>
              </ContainerColumnField>
            </ContainerColumn>
          </ContainerDiv>
        </form>
      </DivBorderRoundContainer>
    </PageLayout>
  );
};
