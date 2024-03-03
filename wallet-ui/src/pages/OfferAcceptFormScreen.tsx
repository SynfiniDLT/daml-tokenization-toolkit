import React, { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { userContext } from "../App";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ContainerColumn,
  ContainerColumnAutoField,
  ContainerColumnField,
  ContainerDiv,
  DivBorderRoundContainer,
} from "../components/layout/general.styled";
import { OneTimeOffer } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";
import Modal from "react-modal";

export const OfferAcceptFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const [transactionRefInput, setTransactionRefInput] = useState("");
  const [maxAmountInput, setMaxAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleTransactionRef = (event: any) => {
    setTransactionRefInput(event.target.value);
  };

  const handleMaxAmountInput = (event: any) => {
    setMaxAmountInput(event.target.value);
  };


  const handleCloseModal = () => {
    setIsModalOpen(!isModalOpen);
    if (error === "") {
      nav("/settlements", { state: { transactionId: state.offer.payload.offerId.unpack } });
    } else {
      nav("/offer/accept", { state: { offer: state.offer } });
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (Number(maxAmountInput) > Number(state.offer.payload.maxQuantity)) {
      setError("Error! Quantity cannot be higher than the Max Quantity Offer.");
      setIsModalOpen(true);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(true);
      await ledger
        .exercise(OneTimeOffer.Accept, state.offer.contractId, {
          quantity: maxAmountInput,
          description: transactionRefInput,
        })
        .then((resp) => {
          if (resp[0]["_2"] !== undefined) {
            setError("");
            setMessage("Offer Accepted with success!");
          } else {
            setError("Error! Contract was not created. Please contact the admin");
          }
          setIsModalOpen(true);
        })
        .catch((err) => {
          setError("Error! Offer Not Accepted \n \n Error:" + JSON.stringify(err.errors[0]));
          setIsModalOpen(true);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  return (
    <PageLayout>
      <h3 className="profile__title">Accept Offer</h3>
      <DivBorderRoundContainer style={{ height: "31em" }}>
        <form onSubmit={handleSubmit}>
          <ContainerDiv style={{ height: "200px" }}>
            <ContainerColumn>
              <ContainerColumnField>Offer: </ContainerColumnField>
              <ContainerColumnAutoField>
                Instruments:
                {state.offer.payload.steps.map((step: any) => {
                  return (
                    <>
                      <p>
                        <br />
                        <br />
                        <br />
                      </p>
                    </>
                  );
                })}
              </ContainerColumnAutoField>
              <ContainerColumnField>Offer quantity: </ContainerColumnField>
              <ContainerColumnField>Accept quantity: </ContainerColumnField>
              <ContainerColumnField style={{ width: "200px", height: "20em" }}>Txn Reference: </ContainerColumnField>
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
                      <div>Issuer: {step.quantity.unit.issuer}</div>
                      <div>Sender: {step.sender}</div>
                      <p></p>
                    </>
                  );
                })}
              </ContainerColumnAutoField>
              <ContainerColumnField></ContainerColumnField>
              <ContainerColumnField>{state.offer.payload.maxQuantity}</ContainerColumnField>
              <ContainerColumnField>
                <input type="number" name="maxAmount" style={{ width: "100px" }} onChange={handleMaxAmountInput} required />
              </ContainerColumnField>
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
          </ContainerDiv>
        </form>
      </DivBorderRoundContainer>
      <Modal
        id="handleCloseMessageModal"
        className="MessageModal"
        isOpen={isModalOpen}
        onRequestClose={() => handleCloseModal}
        contentLabel="Accept Offer"
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
