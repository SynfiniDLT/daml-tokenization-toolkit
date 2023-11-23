import { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLayout } from "../components/PageLayout";
import { formatCurrency, formatPercentage, nameFromParty } from "../components/Util";
import { AccountSummary, HoldingSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { WalletViewsClient } from "@synfini/wallet-views";
import * as damlTypes from "@daml/types";
import * as damlHoldingFungible from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Fungible";
import { FundInvestor } from "@daml.js/fund-tokenization/lib/Synfini/Fund/Offer/Delegation";
import { v4 as uuid } from "uuid";
import {
  ContainerColumn,
  ContainerDiv,
  ContainerColumnKey,
  DivBorderRoundContainer,
  ContainerColumnValue,
} from "../components/layout/general.styled";
import { Coin, BoxArrowUpRight } from "react-bootstrap-icons";

export const FundSubscribeFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}`;
  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountSummary[]>();
  const [inputQtd, setInputQtd] = useState(0);
  const [referenceId, setReferenceId] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchUserLedger = async () => {
    try {
      const user = await ledger.getUser();
      const rights = await ledger.listUserRights();
      const found = rights.find(
        (right) =>
          right.type === "CanActAs" && right.party === user.primaryParty
      );
      ctx.readOnly = found === undefined;

      if (user.primaryParty !== undefined) {
        setPrimaryParty(user.primaryParty);
        ctx.setPrimaryParty(user.primaryParty);
      }
    } catch (err) {
      console.log("error when fetching primary party", err);
    }
  };

  const fetchAccounts = async () => {
    if (primaryParty !== "") {
      const resp = await walletClient.getAccounts({ owner: primaryParty });
      setAccounts(resp.accounts);
      let isFundAccount = resp.accounts?.find(account => account.view.id.unpack.toLowerCase() ==='funds')
      if (isFundAccount== undefined){
        setError("Your Fund Account is not yet prepared for use. Kindly get in touch with the administrator.")
      }
      return resp.accounts;
    }
  };

  const handleChangeInputQtd = (event: any) => {
    setInputQtd(event.target.value);
    let perc = 1 + parseFloat(state.fund.payload.commission);
    let subTotal =
      event.target.value * perc * parseFloat(state.fund.payload.costPerUnit);

    setTotal(subTotal);
  };

  useEffect(() => {
    fetchUserLedger();
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [primaryParty]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const accountFund = accounts?.find(account => account.view.id.unpack.toLowerCase() ==='funds');
    const accountAUDN = accounts?.find(account => account.view.id.unpack.toLowerCase() !=='funds' && account.view.id.unpack.toLowerCase() !=='sbt');
    let holdings: HoldingSummary[] = [];
    let holdingUnlockedCidArr: damlTypes.ContractId<damlHoldingFungible.Fungible>[] = [];


    if (accountFund !== undefined && accountAUDN !== undefined) {
      holdings = (
        await walletClient.getHoldings({
          account: accountAUDN.view,
          instrument: state.fund.payload.paymentInstrument,
        })
      ).holdings;
      holdings
        .filter((holding) => holding.view.lock == null)
        .map((holdingUnlocked) => {
          holdingUnlockedCidArr.push(
            holdingUnlocked.cid.toString() as damlTypes.ContractId<damlHoldingFungible.Fungible>
          );
        });

      if (holdingUnlockedCidArr.length > 0) {
        console.log("accountAUDN", accountAUDN);
        const operators = {
          map: accountAUDN.view.controllers.outgoing.map.delete(accountAUDN.view.owner)
        };
        let referenceIdUUID = uuid();
        try {
          await ledger.exerciseByKey(
            FundInvestor.RequestInvestment,
            {
              investorAccount: accountFund.view,
              unitsInstrument: state.fund.payload.unitsInstrument,
              operators: operators
            },
            {
              numUnits: inputQtd.toString(),
              paymentCids: holdingUnlockedCidArr,
              offerCid: state.fund.contractId,
              investmentId: { unpack: referenceIdUUID },
            }
          );
          setReferenceId(referenceIdUUID);
        } catch (e) {
          setError("Try caatch error: {" + e + "}");
        }
      }
    }
  };


  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Subscribe to {nameFromParty(state.fund.payload.fund)}
      </h3>
      {referenceId === "" && error === "" && (
        <DivBorderRoundContainer>
          <form onSubmit={handleSubmit}>
            <ContainerDiv>
              <ContainerColumn>
                <ContainerColumnKey>Issuer:</ContainerColumnKey>
                <ContainerColumnKey>Fund Manager:</ContainerColumnKey>
                <ContainerColumnKey>Cost Per Unit:</ContainerColumnKey>
                <ContainerColumnKey>Minimal Investment:</ContainerColumnKey>
                <ContainerColumnKey>Commission:</ContainerColumnKey>
                <ContainerColumnKey>Quantity:</ContainerColumnKey>
                <ContainerColumnKey></ContainerColumnKey>
                <p><br/></p>
                
                <ContainerColumnKey>Total:</ContainerColumnKey>
              </ContainerColumn>
              <ContainerColumn>
                <ContainerColumnValue>{state.fund.payload.unitsInstrument.issuer}</ContainerColumnValue>
                <ContainerColumnValue>{state.fund.payload.fundManager}</ContainerColumnValue>
                <ContainerColumnValue>
                  {state.fund.payload.costPerUnit} {state.fund.payload.paymentInstrument.id.unpack} <Coin />
                </ContainerColumnValue>
                <ContainerColumnValue>{formatCurrency(state.fund.payload.minInvesment, "en-US")}</ContainerColumnValue>
                <ContainerColumnValue>{formatPercentage(state.fund.payload.commission)}</ContainerColumnValue>
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
                <ContainerColumnValue style={{verticalAlign:"-10px"}}>{formatCurrency(total.toString(), "en-US")}</ContainerColumnValue>
              </ContainerColumn>
            </ContainerDiv>
            
            {/* <p>Total: {formatCurrency(total.toString(), "en-US")}</p> */}
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
            <ContainerColumnKey>Quantity:</ContainerColumnKey>
            <ContainerColumnKey>Total:</ContainerColumnKey>
            <ContainerColumnKey></ContainerColumnKey>
            <ContainerColumnKey></ContainerColumnKey>
            <ContainerColumnKey></ContainerColumnKey>
            <ContainerColumnKey><button className="button__login" style={{ width: "200px" }} onClick={() => nav("/wallet")}>
                  Back
                </button></ContainerColumnKey>
            </ContainerColumn>

            <ContainerColumn style={{minWidth: "400px"}}>
              <ContainerColumnValue>
                <a href={`http://${window.location.host}/settlements#${referenceId}`} style={{color: "#66FF99"}}>
                  {referenceId} {"    "}<BoxArrowUpRight />
                </a>
              </ContainerColumnValue>
              <ContainerColumnValue> {inputQtd}</ContainerColumnValue>
              <ContainerColumnValue>{formatCurrency(total.toString(), "en-US")}</ContainerColumnValue>
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