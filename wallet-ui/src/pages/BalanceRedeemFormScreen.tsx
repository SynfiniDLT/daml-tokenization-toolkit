import React, { useContext, useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { formatCurrency } from "../components/Util";
import { v4 as uuid } from "uuid";
import * as damlTypes from "@daml/types";
import { HoldingSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import * as damlHoldingFungible from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Fungible";
import { OpenOffer, OpenOffer as SettlementOpenOffer } from "@daml.js/settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer";
import { WalletViewsClient } from "@synfini/wallet-views";
import { ContainerColumn, ContainerDiv, ContainerColumnKey, DivBorderRoundContainer, ContainerColumnValue } from "../components/layout/general.styled";
import Modal from "react-modal";
import { Coin } from "react-bootstrap-icons";
import { fetchDataForUserLedger } from "../components/UserLedgerFetcher";

const BalanceRedeemFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';

  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

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

    try {
      const offerId = state.balance.instrument.id.unpack + "@" + state.balance.instrument.version + ".OffRamp"
      const offers = await ledger.query(SettlementOpenOffer, { offerId: { unpack: offerId } });
      const offersByIssuer = offers.filter(o => o.payload.offerers.map.has(state.balance.instrument.issuer));
      let referenceIdUUID = uuid();
      await ledger
        .exercise(
          OpenOffer.Take,
          offersByIssuer[0].contractId,
          {
            id: { unpack: referenceIdUUID },
            description: "Redeem for fiat",
            taker: ctx.primaryParty,
            quantity: amountInput
          }
        )
        .then((res) => {
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

  useEffect(() => {
    fetchDataForUserLedger(ctx, ledger);
  }, [ctx, ledger]);

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
                {" "}<input
                type="string"
                id="amount"
                name="amount"
                value={amountInput}
                onChange={handleChangeAmount}
                style={{ width: "200px" }}
                onInput={formatCurrencyInput}
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
