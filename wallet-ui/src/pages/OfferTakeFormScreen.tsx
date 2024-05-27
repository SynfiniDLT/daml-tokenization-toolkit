import { useState, ChangeEventHandler } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import { PageLayout } from "../components/PageLayout";
import { formatCurrency, formatOptionalCurrency, randomIdentifierLong, setToArray, truncateParty } from "../Util";
import * as damlTypes from "@daml/types";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer"
import {
  ContainerColumn,
  ContainerDiv,
  ContainerColumnKey,
  DivBorderRoundContainer,
  ContainerColumnValue,
} from "../components/layout/general.styled";
import { BoxArrowUpRight } from "react-bootstrap-icons";
import { CreateEvent } from "@daml/ledger";
import { InstrumentKey, Quantity } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { repairMap } from "../Util";
import { useWalletUser } from "../App";
import Decimal from 'decimal.js';

type OfferAcceptFormScreenState = {
  offer: CreateEvent<SettlementOpenOffer, undefined, string>
}

export const OfferAcceptFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation() as { state: OfferAcceptFormScreenState };
  repairMap(state.offer.payload.offerers.map);
  repairMap(state.offer.payload.settlers.map);
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const [inputQtd, setInputQtd] = useState(state.offer.payload.minQuantity || "0");
  const [referenceId, setReferenceId] = useState<string>("");
  const [error, setError] = useState("");
  const [invalidInput, setInvalidInput] = useState(false);

  const handleInstrumentClick = (instrument: InstrumentKey) => {
    nav("/asset", { state: { instrument } });
  };

  const handleChangeInputQtd: ChangeEventHandler<HTMLInputElement> = (event) => {
    event.preventDefault();
    setInputQtd(event.target.value);

    let value: Decimal;
    try {
      value = new Decimal(event.target.value);
    } catch (e: any) {
      console.warn("Invalid decimal amount: " + event.target.value);
      setInvalidInput(false);
      return;
    }

    if (
      state.offer.payload.increment !== null &&
      !value.modulo(new Decimal(state.offer.payload.increment)).equals("0")
    ) {
      console.error("Invalid amount: " + value.toString());
      setError(`Units must be in increments of ${state.offer.payload.increment}`);
      setInvalidInput(true);
    } else {
      setError("");
      setInvalidInput(false);
    }
  };

  function forQuantity(q: Decimal, costs: boolean): [damlTypes.Party, Quantity<InstrumentKey, Decimal>][] {
    return state
      .offer
      .payload
      .steps
      .filter(step => costs ? step.sender.tag === "TakerEntity" : step.receiver.tag === "TakerEntity")
      .flatMap(step => {
        const counterParty = costs ? step.receiver : step.sender;
        const stepQuantity = {
          unit: step.quantity.unit,
          amount: new Decimal(step.quantity.amount).mul(q)
        };
        if (counterParty.tag === "PartyEntity") {
          return [[counterParty.value, stepQuantity]]
        } else {
          return []
        }
      })
  }

  const handleSubmit:  React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (primaryParty === undefined) {
      setError("Primary party not set");
      return;
    }

    const referenceIdUUID = randomIdentifierLong();
    try {
      await ledger.exercise(
        SettlementOpenOffer.Take,
        state.offer.contractId,
        {
          id: { unpack: referenceIdUUID },
          taker: primaryParty,
          quantity: inputQtd,
          reference: null
        }
      );
      setReferenceId(referenceIdUUID);
    } catch (e: any) {
      setError("Sorry that didn't work");
      console.error("Unable to take settlement open offer", e);
    }
  };

  const displayQuantites = (quantities: [damlTypes.Party, Quantity<InstrumentKey, Decimal>][], costs: boolean) =>
    quantities.map(([party, quantity], index) =>
      <span key={index}>
        {index > 0 ? ', ' : ''}{formatCurrency(quantity.amount) + " "}
        <a onClick={_ => handleInstrumentClick(quantity.unit)}>
          {`${quantity.unit.id.unpack} ${quantity.unit.version}`}
        </a>
        {costs ? " to " : " from "}{truncateParty(party)}
      </span>
    );

  const costPerUnit = forQuantity(new Decimal("1"), true);
  let inputQtdDecimal = new Decimal("0");
  try {
    inputQtdDecimal = new Decimal(inputQtd);
  } catch (e: any) {
    console.warn("Invalid decimal input: " + inputQtdDecimal);
  }
  const receivable = forQuantity(inputQtdDecimal, false);
  const totalCost = forQuantity(inputQtdDecimal, true);

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        {state.offer.payload.offerDescription}
      </h3>
      {referenceId === "" && (
        <DivBorderRoundContainer>
          <form onSubmit={handleSubmit}>
            <ContainerDiv>
              <ContainerColumn style={{width: "600px"}}>
                <ContainerColumnKey>Offered by:</ContainerColumnKey>
                <ContainerColumnKey>Settled by:</ContainerColumnKey>
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
                  {setToArray(state.offer.payload.offerers).map(truncateParty).join(", ")}
                </ContainerColumnValue>
                <ContainerColumnValue>
                  {setToArray(state.offer.payload.settlers).map(e => e.tag === "PartyEntity" ? truncateParty(e.value) : "Offer taker").join(", ")}
                </ContainerColumnValue>
                <ContainerColumnValue>
                  {costPerUnit.length > 0 ? displayQuantites(costPerUnit, true) : "N/A"}
                </ContainerColumnValue>
                <ContainerColumnValue>{formatOptionalCurrency(state.offer.payload.minQuantity)} </ContainerColumnValue>
                <ContainerColumnValue>{formatOptionalCurrency(state.offer.payload.maxQuantity)} </ContainerColumnValue>
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
                    style={{ width: "100px", height: "25px" }}
                  />
                </ContainerColumnValue>
                <p><br/></p>
                <ContainerColumnValue>
                  {receivable.length > 0 && !invalidInput ? displayQuantites(receivable, false) : "N/A"}
                </ContainerColumnValue>
                <ContainerColumnValue style={{verticalAlign:"-10px"}}>
                  {totalCost.length > 0 && !invalidInput ? displayQuantites(totalCost, true) : "N/A"}
                </ContainerColumnValue>
              </ContainerColumn>
            </ContainerDiv>
            <button type="submit" className={"button__login"} style={{ width: "200px" }} disabled={invalidInput}>
              Submit
            </button>
          </form>
          {error !== "" &&
            <ContainerColumn style={{minWidth: "400px"}}>
              <ContainerColumnValue>
              <span
                style={{
                  color: "#FF6699",
                  fontSize: "1.5rem",
                  whiteSpace: "pre-line",
                }}
                >
                {error}
              </span>
              </ContainerColumnValue>
              <ContainerColumnValue>
              </ContainerColumnValue>
            </ContainerColumn>
          }
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
