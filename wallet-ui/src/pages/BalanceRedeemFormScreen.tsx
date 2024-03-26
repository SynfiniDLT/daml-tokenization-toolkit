import React, { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import { formatCurrency } from "../components/Util";
import { v4 as uuid } from "uuid";
import { OpenOffer, OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer";
import { ContainerColumn, ContainerDiv, ContainerColumnKey, DivBorderRoundContainer, ContainerColumnValue } from "../components/layout/general.styled";
import Modal from "react-modal";
import { Coin } from "react-bootstrap-icons";
import { useWalletUser } from "../App";

const BalanceRedeemFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();

  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);

  const handleChangeAmount:  React.ChangeEventHandler<HTMLInputElement> = event => {
    setAmountInput(formatCurrencyInput(event.target.value));
  };

  const formatCurrencyInput = (value: string) => {
    return value.replace(/[^0-9.]/g, "").replace(/^0+/, "");
  };

  const handleCloseMessageModal = (path: string) => {
    setIsMessageOpen(!isMessageOpen);
    if (path !== "") nav("/" + path);
  };

  const handleSubmit:  React.FormEventHandler<HTMLFormElement>= async (e) => {
    e.preventDefault();

    if (primaryParty === undefined) {
      setIsMessageOpen(true);
      setError("Primary party not set");
      return;
    }

    try {
      const offerId = state.balance.instrument.id.unpack + "@" + state.balance.instrument.version + ".OffRamp"
      const offers = await ledger.query(SettlementOpenOffer, { offerId: { unpack: offerId } });
      const offersByIssuer = offers.filter(o => o.payload.offerers.map.has(state.balance.instrument.issuer));
      const referenceIdUUID = uuid();
      await ledger
        .exercise(
          OpenOffer.Take,
          offersByIssuer[0].contractId,
          {
            id: { unpack: referenceIdUUID },
            description: "Redeem for fiat",
            taker: primaryParty,
            quantity: amountInput
          }
        )
        .then(() => {
          setMessage("Your request has been successfully completed. \nTransaction id: " + referenceIdUUID);
        })
        .catch((e) => {
          setError("Error " + e.errors[0].toString());
        });
      setIsMessageOpen(true);
    } catch (e: any) {
      setIsMessageOpen(true);
      setError("Error " + e.toString());
    }
  };

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        StableCoin Redemption
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
                {" "}
                <input
                  type="string"
                  id="amount"
                  name="amount"
                  value={amountInput}
                  onChange={handleChangeAmount}
                  style={{ width: "200px" }}
                />
               {" "}<Coin />
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
        contentLabel="Redeem Balance"
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
