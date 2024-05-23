import { useState, ChangeEventHandler } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import { PageLayout } from "../components/PageLayout";
import { formatCurrency, formatOptionalCurrency, truncateParty } from "../Util";
import * as damlTypes from "@daml/types";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer"
import { v4 as uuid } from "uuid";
import {
  ContainerColumn,
  ContainerDiv,
  ContainerColumnKey,
  DivBorderRoundContainer,
  ContainerColumnValue,
} from "../components/layout/general.styled";
import { BoxArrowUpRight } from "react-bootstrap-icons";
import { CreateEvent } from "@daml/ledger";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { repairMap } from "../Util";
import { useWalletUser } from "../App";

type OfferAcceptFormScreenState = {
  offer: CreateEvent<SettlementOpenOffer, undefined, string>
}

export const OfferAcceptFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation() as { state: OfferAcceptFormScreenState };
  repairMap(state.offer.payload.offerers.map);
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const [inputQtd, setInputQtd] = useState(parseFloat(state.offer.payload.minQuantity || "0"));
  const [referenceId, setReferenceId] = useState<string>("");
  const [error, setError] = useState("");

  const handleInstrumentClick = (instrument: InstrumentKey) => {
    nav("/asset", { state: { instrument } });
  };

  const handleChangeInputQtd: ChangeEventHandler<HTMLInputElement> = (event) => {
    setInputQtd(parseFloat(event.target.value));
  };

  function forQuantity(q: number, costs: boolean): damlTypes.Map<InstrumentKey, number> {
    let quantities = damlTypes.emptyMap<InstrumentKey, number>();

    for (const step of state.offer.payload.steps) {
      if (costs ? step.sender.tag === "TakerEntity" : step.receiver.tag === "TakerEntity") {
        const existingCost = quantities.get(step.quantity.unit) || 0;
        quantities = quantities.set(
          step.quantity.unit, existingCost + parseFloat(step.quantity.amount) * q
        );
      }
    }

    return quantities;
  }

  const handleSubmit:  React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (primaryParty === undefined) {
      setError("Primary party not set");
      return;
    }

    const referenceIdUUID = uuid();
    try {
      await ledger.exercise(
        SettlementOpenOffer.Take,
        state.offer.contractId,
        {
          id: { unpack: referenceIdUUID },
          taker: primaryParty,
          quantity: inputQtd.toString(),
          reference: null
        }
      );
      setReferenceId(referenceIdUUID);
    } catch (e: any) {
      setError("{" + e.errors[0] + "}");
    }
  };

  const displayQuantites = (quantities: [InstrumentKey, number][]) =>
    quantities.map(([instrumentKey, amount], index) =>
      <p key={index}>
        {index > 0 ? ', ' : ''}{formatCurrency(amount.toString(), "en-US") + " "}
        <a onClick={_ => handleInstrumentClick(instrumentKey)}>
          {`${instrumentKey.id.unpack} ${instrumentKey.version}`}
        </a>
      </p>
    );

  const costPerUnit = forQuantity(1, true).entriesArray();
  const receivable = forQuantity(inputQtd, false).entriesArray();
  const totalCost = forQuantity(inputQtd, true).entriesArray();

  console.log("offer === ", state.offer.payload);

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        {state.offer.payload.offerDescription}
      </h3>
      {error !== "" && 
        <>
          <span
            style={{
              color: "#FF6699",
              fontSize: "1.5rem",
              whiteSpace: "pre-line",
            }}
            >
            {error}
          </span>
          <p></p>
          <button className="button__login" style={{ width: "200px" }} onClick={() => nav("/offer")}>
            Back
          </button>
        </>
      }
      {referenceId === "" && error === "" && (
        <DivBorderRoundContainer>
          <form onSubmit={handleSubmit}>
            <ContainerDiv>
              <ContainerColumn style={{width: "600px"}}>
                <ContainerColumnKey>Offered by:</ContainerColumnKey>
                <ContainerColumnKey>Payment per unit:</ContainerColumnKey>
                <ContainerColumnKey>Minimum units:</ContainerColumnKey>
                <ContainerColumnKey>Maximum units:</ContainerColumnKey>
                <ContainerColumnKey>Units:</ContainerColumnKey>
                <p><br/></p>
                <ContainerColumnKey>Amount you will receive:</ContainerColumnKey>
                <ContainerColumnKey>Total payment:</ContainerColumnKey>
              </ContainerColumn>
              <ContainerColumn>
                <ContainerColumnValue>
                  {(state.offer.payload.offerers.map).entriesArray().map(entry => truncateParty(entry[0])).join(", ")}
                </ContainerColumnValue>
                <ContainerColumnValue>
                  {costPerUnit.length > 0 ? displayQuantites(costPerUnit) : "N/A"}
                </ContainerColumnValue>
                <ContainerColumnValue>{formatOptionalCurrency(state.offer.payload.minQuantity, "en-US")} </ContainerColumnValue>
                <ContainerColumnValue>{formatOptionalCurrency(state.offer.payload.maxQuantity, "en-US")} </ContainerColumnValue>
                <ContainerColumnValue>
                  <input
                    type="number"
                    id="qtd"
                    name="qtd"
                    step={state.offer.payload.increment || undefined}
                    min={state.offer.payload.minQuantity || "0"}
                    max={state.offer.payload.maxQuantity || undefined}
                    value={inputQtd}
                    onChange={handleChangeInputQtd}
                    style={{ width: "50px", height: "25px" }}
                  />
                </ContainerColumnValue>
                <p><br/></p>
                <ContainerColumnValue>
                  {receivable.length > 0 ? displayQuantites(receivable) : "N/A"}
                </ContainerColumnValue>
                <ContainerColumnValue style={{verticalAlign:"-10px"}}>
                  {totalCost.length > 0 ? displayQuantites(totalCost) : "N/A"}
                </ContainerColumnValue>
              </ContainerColumn>
            </ContainerDiv>
            <button type="submit" className={"button__login"} style={{ width: "200px" }}>
              Submit
            </button>
          </form>
        </DivBorderRoundContainer>
      )}
      <div>
        {referenceId !== "" && (
          <>
            <p><br/></p>
          <ContainerDiv>
            <ContainerColumn>
              <ContainerColumnKey>Transaction Id:</ContainerColumnKey>
              <ContainerColumnKey></ContainerColumnKey>
              <ContainerColumnKey></ContainerColumnKey>
              <ContainerColumnKey></ContainerColumnKey>
              <ContainerColumnKey>
                <button className="button__login" style={{ width: "200px" }} onClick={() => nav("/wallet")}>
                  Back
                </button>
              </ContainerColumnKey>
            </ContainerColumn>

            <ContainerColumn style={{minWidth: "400px"}}>
              <ContainerColumnValue>
                <a href={`http://${window.location.host}/settlements#${referenceId}`} style={{color: "#66FF99", textDecoration: "underline"}}>
                  {referenceId} {"    "}<BoxArrowUpRight />
                </a>
              </ContainerColumnValue>
              <ContainerColumnValue>
              </ContainerColumnValue>
            </ContainerColumn>
          </ContainerDiv>
          </>
        )}
      </div>
    </PageLayout>
  );
};
