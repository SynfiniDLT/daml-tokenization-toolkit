import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { formatCurrency } from "../components/Util";
import { v4 as uuid } from "uuid";
import * as damlTypes from "@daml/types";
import { InstructBurnHelper } from "@daml.js/daml-mint/lib/Synfini/Mint";
import { MintReceiver } from "@daml.js/daml-mint/lib/Synfini/Mint/Delegation";
import { HoldingSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import * as damlHoldingFungible from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Fungible";
import { WalletViewsClient } from "@synfini/wallet-views";
import { ContainerColumn, ContainerDiv, ContainerColumnKey, DivBorderRoundContainer, ContainerColumnValue } from "../components/layout/general.styled";
import Modal from "react-modal";
import { Coin } from "react-bootstrap-icons";

const BalanceRedeemFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation(); // TODO use strongly typed state instead of `any`
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}`;

  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchUserLedger = async () => {
    try {
      const user = await ledger.getUser();
      const rights = await ledger.listUserRights();
      const found = rights.find((right) => right.type === "CanActAs" && right.party === user.primaryParty);
      ctx.readOnly = found === undefined;

      if (user.primaryParty !== undefined) {
        setPrimaryParty(user.primaryParty);
        ctx.setPrimaryParty(user.primaryParty);
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

  const handleCloseMessageModal = (path: string) => {
    setIsMessageOpen(!isMessageOpen);
    if (path !== "") nav("/" + path);
  };

  const handleSubmit = async (e: any) => {
    console.log("submit");
    e.preventDefault();
    let holdings: HoldingSummary[] = [];
    let holdingUnlockedCidArr: damlTypes.ContractId<damlHoldingFungible.Fungible>[] = [];
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

    console.log("About to exercise");
    try {
      let referenceIdUUID = uuid();
      console.log('state', state);
      let operators = state
          .account
          .operatorsArray
          .reduce(
            (mp: damlTypes.Map<damlTypes.Party, {}>, o: damlTypes.Party) => mp.set(o, {}),
            damlTypes.emptyMap<damlTypes.Party, {}>()
          );
      console.log("key", {
        operators: {
          map: operators
        },
        receiverAccount: state.balance.account,
        instrument: state.balance.instrument
      });
      await ledger
        .exerciseByKey(
          MintReceiver.ReceiverInstructBurn,
          {
            operators: {
              map: operators
            },
            receiverAccount: state.balance.account,
            instrument: state.balance.instrument
          },
          {
            amount: amountInput,
            holdingCids: holdingUnlockedCidArr,
            id: { unpack: referenceIdUUID },
            description: "Redeem for fiat",
          }
        )
        .then((res) => {
          console.log('res', res);
          setMessage("Your request has been successfully completed. \nTransaction id: " + referenceIdUUID);
        })
        .catch((e) => {
          console.log("error", e)
          setError("Error " + e.errors[0].toString());
        });
      setIsMessageOpen(true);
    } catch (e: any) {
      setIsMessageOpen(true);
      console.log("Caught error", e);
      setError("Error " + e.toString());
    }
  };

  useEffect(() => {
    fetchUserLedger();
  }, []);

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        AUDN Redemption
      </h3>

      <DivBorderRoundContainer>
        <form onSubmit={handleSubmit}>
          <ContainerDiv>
          <ContainerColumn>
            <ContainerColumnKey>Account:</ContainerColumnKey>
            <ContainerColumnKey>Instrument:</ContainerColumnKey>
            <ContainerColumnKey>Balance Available:</ContainerColumnKey>
            <ContainerColumnKey>Amount:</ContainerColumnKey>
          </ContainerColumn>

          <ContainerColumn>
            <ContainerColumnValue>{state.balance.account.id.unpack}</ContainerColumnValue>
            <ContainerColumnValue>{state.balance.instrument.id.unpack} <Coin /></ContainerColumnValue>
            <ContainerColumnValue>${formatCurrency(state.balance.unlocked, "en-US")} <Coin /></ContainerColumnValue>
            <ContainerColumnValue>
              ${" "}<input
                type="string"
                id="amount"
                name="amount"
                value={amountInput}
                onChange={handleChangeAmount}
                style={{ width: "200px" }}
                onInput={formatCurrencyInput}
              />
            </ContainerColumnValue>
          </ContainerColumn>
          </ContainerDiv>
          <p><br/></p>
          {parseFloat(state.balance.unlocked) >= parseFloat(amountInput) && (
            <button type="submit" className="button__login" style={{ width: "200px" }}>
              Redeem
            </button>
          )}
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
                onClick={() => handleCloseMessageModal("settlements")}
              >
                See Transactions
              </button>
            </div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;</div>
            <div>
              <button
                type="button"
                className="button__login"
                style={{ width: "150px" }}
                onClick={() => handleCloseMessageModal("wallet")}
              >
                See Wallet
              </button>
            </div>
          </div>
          <p></p>
        </>
      </Modal>
    </PageLayout>
  );
};

export default BalanceRedeemFormScreen;
