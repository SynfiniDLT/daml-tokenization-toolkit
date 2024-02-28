import { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLayout } from "../components/PageLayout";
import { formatCurrency, nameFromParty } from "../components/Util";
import { WalletViewsClient } from "@synfini/wallet-views";
import * as damlTypes from "@daml/types";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer"
import { v4 as uuid } from "uuid";
import {
  ContainerColumn,
  ContainerDiv,
  ContainerColumnKey,
  DivBorderRoundContainer,
  ContainerColumnValue,
} from "../components/layout/general.styled";
import { Coin, BoxArrowUpRight } from "react-bootstrap-icons";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";
import { CreateEvent } from "@daml/ledger";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";

type FundSubscribeFormScreenState = {
  fund: CreateEvent<SettlementOpenOffer, undefined, string>
}

export const FundSubscribeFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation() as { state: FundSubscribeFormScreenState };
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';
  const [inputQtd, setInputQtd] = useState(0);
  const [referenceId, setReferenceId] = useState<string>("");
  const [total, setTotal] = useState(damlTypes.emptyMap<InstrumentKey, number>());
  const [error, setError] = useState("");

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const handleChangeInputQtd = (event: any) => {
    setInputQtd(event.target.value);
    setTotal(costForQuantity(event.target.value));
  };

  function costForQuantity(q: number): damlTypes.Map<InstrumentKey, number> {
    let costsMap = damlTypes.emptyMap<InstrumentKey, number>();

    for (const step of state.fund.payload.steps) {
      if (step.sender.tag == 'TakerEntity') {
        const existingCost = costsMap.get(step.quantity.unit) || 0;
        costsMap = costsMap.set(
          step.quantity.unit, existingCost + parseFloat(step.quantity.amount) * q
        );
      }
    }

    return costsMap;
  }

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    let referenceIdUUID = uuid();
    try {
      await ledger.exercise(
        SettlementOpenOffer.Take,
        state.fund.contractId,
        {
          id: { unpack: referenceIdUUID },
          taker: ctx.primaryParty,
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
                {/* TODO: React does not copy down the functions available on state variables, hence
                `state.fund.payload.map.entriesArray()` is not a function! Therefore we use the below hack to access the
                keys of the map but there should be a better way to do this */}
                <ContainerColumnValue>
                  {(state.fund.payload.offerers.map as any)._keys.map((offerer: string) => nameFromParty(offerer)).join(", ")}
                </ContainerColumnValue>
                <ContainerColumnValue>
                  {costForQuantity(1).entriesArray().map(entry => <>{formatCurrency(entry[1].toString(), "en-US") + " " + entry[0].id.unpack + " "}<Coin/></>)}
                </ContainerColumnValue>
                <ContainerColumnValue>
                  {
                    state.fund.payload.steps
                      .filter(step => step.receiver.tag == "TakerEntity")
                      .map(step =>
                        <p>{formatCurrency((parseFloat(step.quantity.amount) * inputQtd).toString(), "en-US") + " " + step.quantity.unit.id.unpack}</p>)
                  }
                </ContainerColumnValue>
                <ContainerColumnValue>{formatCurrency(state.fund.payload.minQuantity || "0", "en-US")} </ContainerColumnValue>
                <ContainerColumnValue>{formatCurrency(state.fund.payload.maxQuantity || "0", "en-US")} </ContainerColumnValue>
                <ContainerColumnValue>
                  <input
                    type="number"
                    id="qtd"
                    name="qtd"
                    step={1}
                    min="0"
                    value={inputQtd}
                    onChange={handleChangeInputQtd}
                    style={{ width: "50px", height: "25px" }}
                  />
                </ContainerColumnValue>
                <p><br/></p>
                <ContainerColumnValue style={{verticalAlign:"-10px"}}>{total.entriesArray().map(entry => <>{formatCurrency(entry[1].toString(), "en-US") + " " + entry[0].id.unpack + " "}<Coin/></>)}</ContainerColumnValue>
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
            {/* <ContainerColumnKey>Quantity:</ContainerColumnKey>
            <ContainerColumnKey>Total:</ContainerColumnKey> */}
            <ContainerColumnKey></ContainerColumnKey>
            <ContainerColumnKey></ContainerColumnKey>
            <ContainerColumnKey></ContainerColumnKey>
            <ContainerColumnKey><button className="button__login" style={{ width: "200px" }} onClick={() => nav("/wallet")}>
                  Back
                </button></ContainerColumnKey>
            </ContainerColumn>

            <ContainerColumn style={{minWidth: "400px"}}>
              <ContainerColumnValue>
                <a href={`http://${window.location.host}/settlements#${referenceId}`} style={{color: "#66FF99", textDecoration: "underline"}}>
                  {referenceId} {"    "}<BoxArrowUpRight />
                </a>
              </ContainerColumnValue>
              {/* <ContainerColumnValue> {inputQtd}</ContainerColumnValue>
              <ContainerColumnValue>{formatCurrency(total.toString(), "en-US")} {state.fund.payload.paymentInstrument.id.unpack}  <Coin /></ContainerColumnValue> */}
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