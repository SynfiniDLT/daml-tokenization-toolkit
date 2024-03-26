import { useState, ChangeEventHandler } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import { PageLayout } from "../components/PageLayout";
import { formatCurrency, formatOptionalCurrency, nameFromParty } from "../components/Util";
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
import { Coin, BoxArrowUpRight } from "react-bootstrap-icons";
import { CreateEvent } from "@daml/ledger";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { repairMap } from "../components/Util";
import { useWalletUser } from "../App";

type FundSubscribeFormScreenState = {
  fund: CreateEvent<SettlementOpenOffer, undefined, string>
}

export const FundSubscribeFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation() as { state: FundSubscribeFormScreenState };
  repairMap(state.fund.payload.offerers.map);
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const [inputQtd, setInputQtd] = useState(0);
  const [referenceId, setReferenceId] = useState<string>("");
  const [total, setTotal] = useState(damlTypes.emptyMap<InstrumentKey, number>());
  const [error, setError] = useState("");

  const handleChangeInputQtd: ChangeEventHandler<HTMLInputElement> = (event) => {
    const q = parseInt(event.target.value);
    setInputQtd(q);
    setTotal(costForQuantity(q));
  };

  function costForQuantity(q: number): damlTypes.Map<InstrumentKey, number> {
    let costsMap = damlTypes.emptyMap<InstrumentKey, number>();

    for (const step of state.fund.payload.steps) {
      if (step.sender.tag === "TakerEntity") {
        const existingCost = costsMap.get(step.quantity.unit) || 0;
        costsMap = costsMap.set(
          step.quantity.unit, existingCost + parseFloat(step.quantity.amount) * q
        );
      }
    }

    return costsMap;
  }

  const handleSubmit:  React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (primaryParty === undefined) {
      setError("Primary party not set");
      return;
    }

    let referenceIdUUID = uuid();
    try {
      await ledger.exercise(
        SettlementOpenOffer.Take,
        state.fund.contractId,
        {
          id: { unpack: referenceIdUUID },
          taker: primaryParty,
          quantity: inputQtd.toString(),
          description: "Investment request"
        }
      );
      setReferenceId(referenceIdUUID);
    } catch (e: any) {
      setError("{" + e.errors[0] + "}");
    }
  };

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Subscribe to fund
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
          <button className="button__login" style={{ width: "200px" }} onClick={() => nav("/fund")}>
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
                <ContainerColumnKey>Cost Per Unit:</ContainerColumnKey>
                <ContainerColumnKey>Receivable assets:</ContainerColumnKey>
                <ContainerColumnKey>Minimum Purchase quantity:</ContainerColumnKey>
                <ContainerColumnKey>Maximum Purchase quantity:</ContainerColumnKey>
                <ContainerColumnKey>Units to buy:</ContainerColumnKey>
                <p><br/></p>
                <ContainerColumnKey>Total cost:</ContainerColumnKey>
              </ContainerColumn>
              <ContainerColumn>
                <ContainerColumnValue>
                  {(state.fund.payload.offerers.map).entriesArray().map(entry => nameFromParty(entry[0])).join(", ")}
                </ContainerColumnValue>
                <ContainerColumnValue>
                  {costForQuantity(1).entriesArray().map(entry => <>{formatCurrency(entry[1].toString(), "en-US") + " " + entry[0].id.unpack + " "}<Coin/></>)}
                </ContainerColumnValue>
                <ContainerColumnValue>
                  {
                    state.fund.payload.steps
                      .filter(step => step.receiver.tag === "TakerEntity")
                      .map(step =>
                        <p>{formatCurrency((parseFloat(step.quantity.amount) * inputQtd).toString(), "en-US") + " " + step.quantity.unit.id.unpack}</p>)
                  }
                </ContainerColumnValue>
                <ContainerColumnValue>{formatOptionalCurrency(state.fund.payload.minQuantity, "en-US")} </ContainerColumnValue>
                <ContainerColumnValue>{formatOptionalCurrency(state.fund.payload.maxQuantity, "en-US")} </ContainerColumnValue>
                <ContainerColumnValue>
                  <input
                    type="number"
                    id="qtd"
                    name="qtd"
                    step={1}
                    min={state.fund.payload.minQuantity || "0"}
                    max={state.fund.payload.maxQuantity || undefined}
                    value={inputQtd}
                    onChange={handleChangeInputQtd}
                    style={{ width: "50px", height: "25px" }}
                  />
                </ContainerColumnValue>
                <p><br/></p>
                <ContainerColumnValue style={{verticalAlign:"-10px"}}>
                  {
                    total
                      .entriesArray()
                      .map(entry => <>{formatCurrency(entry[1].toString(), "en-US") + " " + entry[0].id.unpack + " "}<Coin/></>)
                  }
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
