import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { formatCurrency } from "../components/Util";
import { v4 as uuid } from "uuid";
import * as damlTypes from "@daml/types";
import { InstructBurnHelper } from "@daml.js/daml-mint/lib/Synfini/Mint";
import { HoldingSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import * as damlHoldingFungible from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Fungible";
import { WalletViewsClient } from "@synfini/wallet-views";
import { DivRoundContainer } from "../components/layout/general.styled";

const BalanceRedeemFormScreen: React.FC = () => {
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const nav = useNavigate();
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}/wallet-views`;

  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

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
      } else {
      }
    } catch (err) {
      console.log("error when fetching primary party", err);
    }
  };

  const handleChangeAmount = (event: any) => {
    setAmountInput(formatCurrencyInput(event));
  };

  const formatCurrencyInput = (event: any) => {
    let value = event.target.value.replace(/[^0-9.]/g, "").replace(/^0+/, "");
    return value;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    let holdings: HoldingSummary[] = [];
    let holdingUnlockedCidArr: damlTypes.ContractId<damlHoldingFungible.Fungible>[] =
      [];
    holdings = (
      await walletClient.getHoldings({
        account: state.balance.account,
        instrument: state.balance.instrument,
      })
    ).holdings;
    holdings
      .filter((holding) => holding.view.lock == null)
      .map((holdingUnlocked) => {
        holdingUnlockedCidArr.push(
          holdingUnlocked.cid.toString() as damlTypes.ContractId<damlHoldingFungible.Fungible>
        );
      });

    try {
      let referenceIdUUID = uuid();
      let instructBurnFromFungiblesResponse = await ledger.createAndExercise(
        InstructBurnHelper.InstructBurnFromFungibles,
        { instructor: primaryParty },
        {
          amount: amountInput,
          holdingCids: holdingUnlockedCidArr,
          id: { unpack: referenceIdUUID },
          description: "Redeem for fiat",
        }
      );
      console.log("response exec", instructBurnFromFungiblesResponse);
      if (instructBurnFromFungiblesResponse.length > 1) {
        setResult(
          "Your redeem was completed with sucess. \nTransaction id: " +
            referenceIdUUID
        );
      }
    } catch (e) {
      setError("Try caatch error: {" + e + "}");
    }
  };

  const handleClick = (path: string) => {
    console.log("here")
    nav("/" + path);
  };


  useEffect(() => {
    fetchUserLedger();
  }, []);

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Redeem Balance
      </h3>
      {result !== "" ? (
        <>
          <p></p>
          <div style={{ color: "green", whiteSpace: "pre-line" }}>{result}</div>
          <div>
            <button onClick={() => handleClick("wallet")}>
                Wallet
            </button>
            <button onClick={() => handleClick("settlements")}>
                Transactions
            </button>
          </div>
        </>
      ) : (
        <DivRoundContainer>
          <form onSubmit={handleSubmit}>
            <p>Account: {state.balance.account.id.unpack}</p>
            <p>Instrument: {state.balance.instrument.id.unpack}</p>
            <p>
              Balance unlocked to redeem:{" "}
              {formatCurrency(state.balance.unlocked, "en-US")}
            </p>
            <span>Amount:</span>
            <span>
              <input
                type="string"
                id="amount"
                name="amount"
                value={amountInput}
                onChange={handleChangeAmount}
                style={{ width: "200px" }}
                onInput={formatCurrencyInput}
              />
            </span>
            {parseFloat(state.balance.unlocked) >= parseFloat(amountInput) && (
              <button
                type="submit"
                className="button__login"
                style={{ width: "200px" }}
              >
                Redeem
              </button>
            )}
          </form>
        </DivRoundContainer>
      )}
    </PageLayout>
  );
};

export default BalanceRedeemFormScreen;
