import React, { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { useWalletUser, userContext } from "../App";
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
import { CreateEvent } from "@daml/ledger";
import { repairMap, setToArray } from "../Util";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { Step } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Types";

type OfferAcceptFormScreenState = {
  offer: CreateEvent<OneTimeOffer, undefined, string>
}

export const OfferAcceptFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation() as { state: OfferAcceptFormScreenState };
  repairMap(state.offer.payload.offerers.map);

  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const [transactionRefInput, setTransactionRefInput] = useState("");
  const defaultQuantity = state.offer.payload.minQuantity || "1";
  const [quantityInput, setQuantityInput] = useState(defaultQuantity);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleInstrumentClick = (instrument: InstrumentKey) => {
    nav("/asset", { state: { instrument } });
  };


  const handleTransactionRef: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setTransactionRefInput(event.target.value);
  };

  const handleQuantityInput: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setQuantityInput(event.target.value);
  };

  const handleCloseModal = () => {
    setIsModalOpen(!isModalOpen);
    if (error === "") {
      nav("/settlements", { state: { transactionId: state.offer.payload.offerId.unpack } });
    } else {
      nav("/offer/accept", { state: { offer: state.offer } });
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    await ledger
      .exercise(
        OneTimeOffer.Accept,
        state.offer.contractId,
        {
          quantity: quantityInput,
          description: transactionRefInput,
        }
      )
      .then((resp) => {
        if (resp[0]._2 !== undefined) {
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
  };

  function stepElements(delivery: boolean, steps: Step[]) {
    const stepValues = steps
      .filter(step => delivery ? step.sender === primaryParty : step.receiver === primaryParty)
      .map((step, index) =>
        <div key={index}>
          <a onClick={_ => handleInstrumentClick(step.quantity.unit)}>
            {parseFloat(quantityInput) * parseFloat(step.quantity.amount)} {step.quantity.unit.id.unpack} {step.quantity.unit.version}
          </a>
          {delivery ? ` to ${step.receiver}` : ` from ${step.sender}`}
        </div>
      );

    return stepValues.length > 0 ? stepValues : <div>N/A</div>
  }

  const fixedAmount = state.offer.payload.maxQuantity !== null &&
    state.offer.payload.maxQuantity === state.offer.payload.minQuantity;

  return (
    <PageLayout>
      <h3 className="profile__title">Accept Offer</h3>
      <DivBorderRoundContainer style={{ height: "31em" }}>
        <form onSubmit={handleSubmit}>
          <ContainerDiv style={{ height: "200px" }}>
            <ContainerColumn>
              <ContainerColumnField>ID: </ContainerColumnField>
              <ContainerColumnField>Description: </ContainerColumnField>
              <ContainerColumnField>Offered by: </ContainerColumnField>
              <ContainerColumnField>Receivable: </ContainerColumnField>
              <ContainerColumnField>Deliverable: </ContainerColumnField>
              {!fixedAmount && <ContainerColumnField>Select amount: </ContainerColumnField>}
              <ContainerColumnField>Reference: </ContainerColumnField>
              {/* <ContainerColumnField style={{ width: "200px", height: "20em" }}>Txn Reference: </ContainerColumnField>
              <p></p>
              <p></p> */}
              <button type="submit" className="button__login" disabled={isSubmitting}>
                Submit
              </button>
            </ContainerColumn>
            <ContainerColumn>
              <ContainerColumnField style={{ width: "600px" }}>
                {state.offer.payload.offerId.unpack}
              </ContainerColumnField>
              <ContainerColumnField style={{ width: "600px" }}>
                {state.offer.payload.offerDescription}
              </ContainerColumnField>
              <ContainerColumnField style={{ width: "600px" }}>
                {setToArray(state.offer.payload.offerers).map(party => <>{party}<br/></>)}
              </ContainerColumnField>
              <ContainerColumnAutoField style={{ width: "800px" }}>
                {stepElements(false, state.offer.payload.steps)}
              </ContainerColumnAutoField>
              <ContainerColumnAutoField style={{ width: "800px" }}>
                {stepElements(true, state.offer.payload.steps)}
              </ContainerColumnAutoField>
              {/* <ContainerColumnField>{state.offer.payload.maxQuantity}</ContainerColumnField> */}
              {!fixedAmount &&
                <ContainerColumnField>
                  <input
                    type="number"
                    name="quantity"
                    style={{ width: "100px" }}
                    onChange={handleQuantityInput}
                    required
                    min={state.offer.payload.minQuantity || "0"}
                    max={state.offer.payload.maxQuantity || undefined}
                    defaultValue={defaultQuantity}
                  />
                </ContainerColumnField>
              }
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
