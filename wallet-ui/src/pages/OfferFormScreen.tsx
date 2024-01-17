import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLayout } from "../components/PageLayout";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import {
  ContainerColumn,
  ContainerColumnField,
  ContainerDiv,
  DivBorderRoundContainer,
} from "../components/layout/general.styled";
import { Factory as OneTimeOfferFactory } from "@daml.js/settlement-one-time-offer-interface/lib/Synfini/Interface/Settlement/OneTimeOffer/Factory";
import { Factory as SettlementFactory } from "@daml.js/daml-finance-interface-settlement-2.0.0/lib/Daml/Finance/Interface/Settlement/Factory";
import { RouteProvider } from "@daml.js/daml-finance-interface-settlement-2.0.0/lib/Daml/Finance/Interface/Settlement/RouteProvider";
import { Party, emptyMap, Map } from "@daml/types";
import { Set } from "@daml.js/97b883cd8a2b7f49f90d5d39c981cf6e110cf1f1c64427a28a6d58ec88c43657/lib/DA/Set/Types";
import { v4 as uuid } from "uuid";
import { arrayToSet } from "../components/Util";
import Modal from "react-modal";

export const OfferFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [producerInput, setProducerInput] = useState("");
  const [investorInput, setInvestorInput] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);

  const handleProducerInput = (event: any) => {
    setProducerInput(event.target.value);
  };

  const handleInvestorInput = (event: any) => {
    setInvestorInput(event.target.value);
  };


  const handleCloseMessageModal = (path: string) => {
    setIsMessageOpen(!isMessageOpen);
    if (path !== "") nav("/" + path);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    let oneTimeOfferFactory = await ledger.query(OneTimeOfferFactory);
    let settlementFactory = await ledger.query(SettlementFactory);
    let routeProvider = await ledger.query(RouteProvider);

    const description = state.instrument.tokenView?.token.description;
    const json_description = JSON.parse(description);

    let idUUID = uuid();
    const observers: Map<string, Set<Party>> = emptyMap();
    await ledger
      .exercise(OneTimeOfferFactory.Create, oneTimeOfferFactory[0].contractId, {
        offerId: { unpack: idUUID },
        offerDescription: "Offer for " + state.instrument.tokenView.token.instrument.id.unpack,
        offerers: arrayToSet([ctx.primaryParty]),
        offeree: investorInput,
        settlementInstructors: arrayToSet([ctx.primaryParty]),
        settlers: arrayToSet([ctx.primaryParty, investorInput, producerInput]),
        observers: observers,
        settlementTime: null,
        steps: [],
        minQuantity: json_description.piePointQuantity,
        maxQuantity: json_description.piePointQuantity,
        routeProviderCid: routeProvider[0].contractId,
        settlementFactoryCid: settlementFactory[0].contractId,
      })

      .then((res) => {
        console.log("res", res);
        setMessage("Offer created with sucess. \nOffer id: " + idUUID);
        setIsMessageOpen(true);
      })
      .catch((e) => {
        console.log("error", e);
        setError("Error " + e.errors[0].toString());
        setIsMessageOpen(true);
      });
  };


  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Create Offer
      </h3>
      <DivBorderRoundContainer>
        <form onSubmit={handleSubmit}>
          <ContainerDiv>
            <ContainerColumn>
              <ContainerColumnField>Instrument ID:</ContainerColumnField>
              <ContainerColumnField>Producer Party:</ContainerColumnField>
              <ContainerColumnField>Investor Party:</ContainerColumnField>
              <p></p>
              <button type="submit" className="button__login" disabled={isSubmitting}>
                Submit
              </button>
            </ContainerColumn>
            <ContainerColumn>
              <ContainerColumnField>{state.instrument.tokenView.token.instrument.id.unpack}</ContainerColumnField>
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
        isOpen={isMessageOpen}
        onRequestClose={() => handleCloseMessageModal}
        contentLabel="share SBT"
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
                onClick={() => handleCloseMessageModal("offers")}
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

