import { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLayout } from "../components/PageLayout";
import { formatCurrency, nameFromParty } from "../components/Util";
import {
  AccountSummary,
  HoldingSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { WalletViewsClient } from "@synfini/wallet-views";
import * as damlTypes from "@daml/types";
import * as damlHoldingFungible from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Fungible";
import { FundInvestor } from "@daml.js/fund-tokenization/lib/Synfini/Fund/Offer/Delegation";
import { v4 as uuid } from "uuid";
import { DivBorderRoundContainer } from "../components/layout/general.styled";

export const FundSubscribeFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}/wallet-views`;
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
        const operators = {
          map: accountAUDN.view.controllers.outgoing.map.delete(accountAUDN.view.owner)
        }; // Bug here, operators should contain one party -- the wallet operator -- but it seems to be empty
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
            <p>Name: {nameFromParty(state.fund.payload.fund)}</p>
            <p>Fund Manager: {nameFromParty(state.fund.payload.fundManager)}</p>
            <p>
              Cost Per Unit: {state.fund.payload.costPerUnit}{" "}
              {state.fund.payload.paymentInstrument.id.unpack}
            </p>
            <p>Minimal Investment: {state.fund.payload.minInvesment}</p>
            <p>Comission: {state.fund.payload.commission}</p>
            <span></span>
            Quantity:{" "}
            <input
              type="number"
              id="qtd"
              name="qtd"
              step={1}
              min="0"
              value={inputQtd}
              onChange={handleChangeInputQtd}
              style={{ width: "200px" }}
            />
            <p>Total: {formatCurrency(total.toString(),"en-US")}</p>
            {total >= parseFloat(state.fund.payload.minInvesment) && (
              <button
                type="submit"
                className={"button__login"}
                style={{ width: "200px" }}
              >
                Submit
              </button>
            )}
          </form>
        </DivBorderRoundContainer>
      )}
      <div>
        {referenceId !== "" && (
          <>
            <p><br/><br/><br/></p>
            <p>Reference Id: {referenceId}</p>
            <p>Quantity: {inputQtd}</p>
            <p>Total: {formatCurrency(total.toString(),"en-US")}</p>
            <p></p>
            <div style={{ color: "red", whiteSpace: "pre-line" }}>{error}</div>
            <p></p>
            <button className="button__login" style={{width: "200px"}} onClick={() => nav("/wallet")}>Back</button >
          </>
        )}
      </div>
    </PageLayout>
  );
};