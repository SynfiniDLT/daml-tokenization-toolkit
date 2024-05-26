import React, { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { useWalletUser, userContext } from "../App";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DivBorderRoundContainer,
} from "../components/layout/general.styled";
import { OneTimeOffer } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/OneTimeOffer";
import Modal from "react-modal";
import { CreateEvent } from "@daml/ledger";
import { repairMap, setToArray } from "../Util";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import Decimal from "decimal.js";

type RequestAcceptFormScreenState = {
  offer: CreateEvent<OneTimeOffer, undefined, string>
}

export const RequestAcceptFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation() as { state: RequestAcceptFormScreenState };
  repairMap(state.offer.payload.offerers.map);

  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const [transactionRefInput, setTransactionRefInput] = useState<string | null>(null);
  const defaultQuantity = state.offer.payload.minQuantity || "1";
  const [quantityInput, setQuantityInput] = useState(defaultQuantity);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [accepted, setAccepted] = useState(false);

  const isOfferee = primaryParty === state.offer.payload.offeree;
  const isOfferer = primaryParty !== undefined && state.offer.payload.offerers.map.has(primaryParty);

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
      if (accepted) {
        nav("/settlements", { state: { transactionId: state.offer.payload.offerId.unpack } });
      } else {
        nav("/requests");
      }
    } else {
      nav("/request/accept", { state: { offer: state.offer } });
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    try {
      await ledger.exercise(
        OneTimeOffer.Accept,
        state.offer.contractId,
        {
          quantity: quantityInput,
          reference: transactionRefInput,
        }
      );
      setAccepted(true);
      setError("");
      const message = isOfferee ? "accepted" : "removed";
      setMessage(`Request ${message}`);
      setIsModalOpen(true);
    } catch (err) {
      setError("Sorry that didn't work");
      console.log("Error submitting form", err);
      setIsModalOpen(true);
    }
  };

  const handleReject: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();

    try {
      await ledger.exercise(OneTimeOffer.Reject, state.offer.contractId, {});
      setError("");
      setMessage("Request rejected");
      setIsModalOpen(true);
    } catch(err) {
      setError("Sorry that didn't work");
      console.log("Error submitting form", err);
      setIsModalOpen(true);
    }
  }

  const handleRemove: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();

    try {
      await ledger.exercise(OneTimeOffer.Revoke, state.offer.contractId, {});
      setError("");
      setMessage("Request removed");
      setIsModalOpen(true);
    } catch(err) {
      setError("Sorry that didn't work");
      console.log("Error submitting form", err);
      setIsModalOpen(true);
    }
  }

  function stepElements(delivery: boolean) {
    const stepValues = state
      .offer
      .payload
      .steps
      .filter(step => delivery ? step.sender === primaryParty : step.receiver === primaryParty)
      .map((step, index) =>
        <div key={index}>
          <a onClick={_ => handleInstrumentClick(step.quantity.unit)}>
            {
              (fixedAmount || isOfferee) &&
              new Decimal(quantityInput).mul(new Decimal(step.quantity.amount))
            } {step.quantity.unit.id.unpack} {step.quantity.unit.version}
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
      <h3 className="profile__title">Settlement Request</h3>
      <DivBorderRoundContainer style={{ height: "auto" }}>
        <form onSubmit={handleSubmit}>
          <table className="request">
            <tbody>
              <tr>
                <th>ID:</th>
                <td>{state.offer.payload.offerId.unpack}</td>
              </tr>
              <tr>
                <th>Description:</th>
                <td>{state.offer.payload.offerDescription}</td>
              </tr>
              <tr>
                <th>Requested by:</th>
                <td>{setToArray(state.offer.payload.offerers).map(party => <div key={party}>{party}<br/></div>)}</td>
              </tr>
              <tr>
                <th>Receivable:</th>
                <td>{stepElements(false)}</td>
              </tr>
              <tr>
                <th>Deliverable:</th>
                <td>{stepElements(true)}</td>
              </tr>
              {
                !fixedAmount && isOfferee &&
                <tr>
                  <th>Select amount:</th>
                  <td>
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
                  </td>
                </tr>
              }
              {
                isOfferee &&
                <tr>
                  <th>Reference (optional):</th>
                  <td>
                    <input
                      type="text"
                      name="transactionRef"
                      style={{ width: "300px" }}
                      onChange={handleTransactionRef}
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
          {
            isOfferee &&
            <button type="submit" className="button__login" style={{ width: "150px" }}>
              Accept
            </button>
          }
          {
            isOfferee &&
            <button type="button" className="button__login" style={{ width: "150px" }} onClick={handleReject}>
              Reject
            </button>
          }
          {
            primaryParty !== undefined && isOfferer &&
            <button type="button" className="button__login" style={{ width: "150px" }} onClick={handleRemove}>
              Remove
            </button>
          }
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
