import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import { PageLayout } from "../components/PageLayout";
import {
  ContainerColumn,
  ContainerColumnField,
  ContainerDiv,
  DivBorderRoundContainer,
} from "../components/layout/general.styled";
import { Factory as OneTimeOfferFactory } from "@daml.js/synfini-settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/Factory";
import { Factory as SettlementFactory } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Factory";
import { RouteProvider } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/RouteProvider";
import { v4 as uuid } from "uuid";
import { arrayToMap, arrayToSet } from "../Util";
import Modal from "react-modal";
import { useWalletUser } from "../App";

// TODO add correct type annotations to this component instead of using `any`
export const OfferFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [producerInput, setProducerInput] = useState("");
  const [investorInput, setInvestorInput] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleProducerInput = (event: any) => {
    setProducerInput(event.target.value);
  };

  const handleInvestorInput = (event: any) => {
    setInvestorInput(event.target.value);
  };

  const handleCloseModal = (path: string) => {
    setIsModalOpen(!isModalOpen);
    if (path !== "") nav("/" + path);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (primaryParty === undefined) {
      setError("Error primary party not set");
      setIsModalOpen(true);
      return;
    }

    const oneTimeOfferFactory = await ledger.query(OneTimeOfferFactory);
    const settlementFactory = await ledger.query(SettlementFactory);
    const routeProvider = await ledger.query(RouteProvider);

    const description = state.instrument.tokenView?.token.description;
    const json_description = JSON.parse(description);

    const idUUID = uuid();
    await ledger
      .exercise(OneTimeOfferFactory.Create, oneTimeOfferFactory[0].contractId, {
        offerId: { unpack: idUUID },
        offerDescription: "Offer for " + state.instrument.tokenView.token.instrument.id.unpack,
        offerers: arrayToSet([primaryParty]),
        offeree: investorInput,
        settlementInstructors: arrayToSet([primaryParty]),
        settlers: arrayToSet([primaryParty, investorInput, producerInput]),
        observers: arrayToMap([["initialObservers", arrayToSet([producerInput])]]),
        settlementTime: null,
        steps: [{
          sender: primaryParty, receiver: producerInput, quantity: {amount: "1", unit: state.instrument.tokenView.token.instrument}
        },{
          sender: producerInput, receiver: investorInput, quantity: {amount: "1", unit: state.instrument.tokenView.token.instrument}
        }],
        minQuantity: "1",
        maxQuantity: json_description.certificateQuantity,
        routeProviderCid: routeProvider[0].contractId,
        settlementFactoryCid: settlementFactory[0].contractId,
      })

      .then((res) => {
        setMessage("Offer created with success. \nOffer id: " + idUUID);
        setIsModalOpen(true);
      })
      .catch((e) => {
        setError("Error " + e.errors[0].toString());
        setIsModalOpen(true);
      });
  };

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Create Offer
      </h3>
      <DivBorderRoundContainer>
        <form onSubmit={handleSubmit}>
          <ContainerDiv>
            <ContainerColumn style={{minWidth: "250px"}}>
              <ContainerColumnField>Instrument ID:</ContainerColumnField>
              <ContainerColumnField>Instrument Depository:</ContainerColumnField>
              <ContainerColumnField>Instrument Issuer:</ContainerColumnField>
              <ContainerColumnField>Producer Party:</ContainerColumnField>
              <ContainerColumnField>Investor Party:</ContainerColumnField>
              <p></p>
              <button type="submit" className="button__login" disabled={isSubmitting}>
                Submit
              </button>
            </ContainerColumn>
            <ContainerColumn>
              <ContainerColumnField>{state.instrument.tokenView.token.instrument.id.unpack}</ContainerColumnField>
              <ContainerColumnField>{state.instrument.tokenView.token.instrument.depository}</ContainerColumnField>
              <ContainerColumnField>{state.instrument.tokenView.token.instrument.issuer}</ContainerColumnField>
              <ContainerColumnField>
                <input
                  type="text"
                  id="producer"
                  name="producer"
                  style={{ width: "350px" }}
                  onChange={handleProducerInput}
                />
              </ContainerColumnField>
              <ContainerColumnField>
                <input
                  type="text"
                  id="investor"
                  name="investor"
                  style={{ width: "350px" }}
                  onChange={handleInvestorInput}
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
                onClick={() => handleCloseModal("offers")}
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

