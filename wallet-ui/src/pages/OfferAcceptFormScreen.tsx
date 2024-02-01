import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import AuthContextStore from "../store/AuthContextStore";
import { userContext } from "../App";
import { WalletViewsClient } from "@synfini/wallet-views";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { PageLoader } from "../components/layout/page-loader";
import { useLocation, useNavigate } from "react-router-dom";
import AccountsSelect from "../components/layout/accountsSelect";
import {
  ContainerColumn,
  ContainerColumnAutoField,
  ContainerColumnField,
  ContainerDiv,
  DivBorderRoundContainer,
  KeyColumn,
  KeyValuePair,
  ValueColumn,
} from "../components/layout/general.styled";
import { OneTimeOffer } from "@daml.js/settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";
import Modal from "react-modal";

export const OfferAcceptFormScreen: React.FC = () => {
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || "";
  const nav = useNavigate();
  const { state } = useLocation();
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();
  const [accounts, setAccounts] = useState<any>();
  const [transactionRefInput, setTransactionRefInput] = useState("");
  const [selectAccountInput, setSelectAccountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [offerAccepted, setOfferAccepted] = useState<any>();

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });
  const fetchAccounts = async () => {
    if (ctx.primaryParty !== "") {
      const respAcc = await walletClient.getAccounts({ owner: ctx.primaryParty, custodian: null });
      setAccounts(respAcc.accounts);
    }
  };

  const handleTransactionRef = (event: any) => {
    setTransactionRefInput(event.target.value);
  };

  const handleAccountChange = (event: any) => {
    setSelectAccountInput(event.target.value);
  };

  const handleCloseModal = () => {
    setIsModalOpen(!isModalOpen);
    if (error === "") {
      nav("/settlements", { state: { transactionId: state.offer.payload.offerId.unpack } });
    } else {
      nav("/offers");
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await ledger
      .exercise(OneTimeOffer.Accept, state.offer.contractId, {
        quantity: state.offer.payload.maxQuantity,
        description: transactionRefInput,
      })
      .then((resp) => {
        if (resp[0]["_2"] !== undefined) {
          setMessage("Offer Accepted with success!");
          setOfferAccepted(resp);
        } else {
          setError("Error! Contract was not created. Please contact the admin");
        }
        setIsModalOpen(true);
      })
      .catch((err) => {
        setError("Error! Offer Not Accepted \n \n Error:" + JSON.stringify(err.errors[0]));
        setIsModalOpen(true);
      })
      .finally(() => {});
  };

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <PageLayout>
      <h3 className="profile__title">Accept Offer</h3>
      <DivBorderRoundContainer style={{ height: "20em" }}>
        <form onSubmit={handleSubmit}>
          <ContainerDiv style={{ height: "200px" }}>
            <ContainerColumn>
              <ContainerColumnField>Offer: </ContainerColumnField>
              <ContainerColumnAutoField>Instruments: 
              {state.offer.payload.steps.map((step: any) => {
                  return (
                    <>
                      <p></p>
                    </>
                  );
                })}
              </ContainerColumnAutoField>
              <ContainerColumnField style={{ width: "200px", height: "20em" }}>Transaction Reference: </ContainerColumnField>
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
              <ContainerColumnAutoField style={{ width: "800px" }}>
                {state.offer.payload.steps.map((step: any) => {
                  return (
                    <>
                      <div>{step.quantity.unit.id.unpack}</div>
                      <div>Issuer: {step.quantity.unit.issuer }</div>
                      <div>Sender: {step.sender }</div>
                      <p></p>
                    </>
                  );
                })}
              </ContainerColumnAutoField>
              <ContainerColumnField></ContainerColumnField>
              <ContainerColumnField>
                <input
                  type="text"
                  name="transactionRef"
                  style={{ width: "300px" }}
                  onChange={handleTransactionRef}
                  required
                />
              </ContainerColumnField>
            </ContainerColumn>
            {/* <ContainerColumn>
              <KeyValuePair>
                <ValueColumn>Offer:</ValueColumn>
                <ValueColumn>Instruments:</ValueColumn>
                <ValueColumn>Transaction Reference:</ValueColumn>
                <KeyColumn>ff</KeyColumn>
                <KeyColumn>,,</KeyColumn>
                <KeyColumn>sss</KeyColumn>
              </KeyValuePair>
            </ContainerColumn> */}
          </ContainerDiv>
        </form>
      </DivBorderRoundContainer>
      <Modal
        id="handleCloseMessageModal"
        className="MessageModal"
        isOpen={isModalOpen}
        onRequestClose={() => handleCloseModal}
        contentLabel="Create Offer"
      >
        <>
          <div>
            {message !== "" ? (
              <span style={{ color: "#66FF99", fontSize: "1.5rem", whiteSpace: "pre-line" }}>{message}</span>
            ) : (
              <span style={{ color: "#FF6699", fontSize: "1.5rem", whiteSpace: "pre-line" }}>{error}</span>
            )}
          </div>
          <p></p>
          <div className="containerButton">
            <div>
              <button
                type="button"
                className="button__login"
                style={{ width: "150px" }}
                onClick={() => handleCloseModal()}
              >
                OK
              </button>
            </div>
          </div>
          <p></p>
        </>
      </Modal>
    </PageLayout>
  );
};
