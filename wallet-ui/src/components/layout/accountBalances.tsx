import { useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { AccountSummary, Balance } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer";
import { formatCurrency, randomIdentifierLong, truncateParty } from "../../Util";
import { Coin } from "react-bootstrap-icons";
import HoverPopUp from "./hoverPopUp";
import { useEffect, useState } from "react";
import { AccountKey, Id, InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { routeProviderCid, settlementFactoryCid, stableCoinInstrumentId } from "../../Configuration";
import { useWalletUser, useWalletViews, userContext } from "../../App";
import { CreateEvent } from "@daml/ledger";
import Decimal from "decimal.js";
import * as damlTypes from "@daml/types";
import { InstructTransferFromFungiblesHelper } from "@daml.js/synfini-settlement-helpers/lib/Synfini/Settlement/Helpers";
import { Fungible } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Fungible";

export type AccountBalanceSummary = {
  account: AccountSummary,
  balances: Balance[]
};

export default function AccountBalances(props: { accountBalances: AccountBalanceSummary[] }) {
  const nav = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false); // TODO remove?
  const [isTransferModelOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const walletViews = useWalletViews();
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const [offRampOffer, setOffRampOffer] = useState<CreateEvent<SettlementOpenOffer, undefined, string>>();
  const [amountToTransfer, setAmountToTransfer] = useState<damlTypes.Decimal>("0");
  const [balanceToTransferFrom, setBalanceToTransferFrom] = useState<Balance>();
  const [receiver, setReceiver] = useState<damlTypes.Party>();
  const [transferBatchId, setTransferBatchId] = useState<Id>();
  const [error, setError] = useState("");

  const handleRedeem = () => {
    if (offRampOffer !== undefined) {
      nav("/offer/accept", { state: { offer: offRampOffer } });
    } else {
      console.warn("Off-ramp offer is not defined");
    }
  };

  const handleClickTransfer = (balance: Balance) => {
    setBalanceToTransferFrom(balance);
    setIsTransferModalOpen(true);
  }

  const handleChangeReceiver: React.ChangeEventHandler<HTMLInputElement> = event => {
    event.preventDefault();

    setReceiver(event.target.value);
  }

  const handleChangeTransferAmount: React.ChangeEventHandler<HTMLInputElement> = event => {
    event.preventDefault();

    setAmountToTransfer(event.target.value);
  }

  const handleSubmitTransfer: React.MouseEventHandler<HTMLButtonElement> = async (event) => {
    event.preventDefault();

    if (
      primaryParty === undefined ||
      receiver === undefined ||
      balanceToTransferFrom === undefined
    ) {
      console.warn("Unset parameters when submitting transfer");
      setError("Sorry there was a problem with the page data");
      return;
    }

    try {
      const availableHoldings = await walletViews.getHoldings({
        account: balanceToTransferFrom.account,
        instrument: balanceToTransferFrom.instrument
      });
      const holdingCids = availableHoldings
        .holdings
        .filter(h => h.view.lock === null)
        .map(h => h.cid as damlTypes.ContractId<any>);
      const batchId = {
        unpack: randomIdentifierLong()
      };
      await ledger.createAndExercise(
        InstructTransferFromFungiblesHelper.InstructTransfer,
        {
          id: batchId,
          contextId: null,
          description: "Transfer request",
          sender: primaryParty,
          receiver,
          quantity: {
            unit: balanceToTransferFrom.instrument,
            amount: amountToTransfer
          },
          holdingCids,
          settlementFactoryCid,
          routeProviderCid
        },
        {}
      );
      setTransferBatchId(batchId);
    } catch (err: any) {
      setError("Sorry that didn't work");
      console.error("Unable to instruct transfer", err);
    }

    setIsTransferModalOpen(false);
  }

  const handleCloseMessageModal = () => {
    setTransferBatchId(undefined);
    setBalanceToTransferFrom(undefined);
    setAmountToTransfer("0");
    setReceiver(undefined);
  };

  const handleCloseTransferModal = () => {
    setIsTransferModalOpen(false);
    setBalanceToTransferFrom(undefined);
    setReceiver(undefined);
  }

  const handleInstrumentClick = (instrument: InstrumentKey) => {
    setIsOpen(!isOpen);
    nav("/asset", { state: { instrument } });
  };

  useEffect(() => {
    const stableCoinBalances = props
      .accountBalances
      .flatMap(summary => summary.balances.filter(b => b.instrument.id.unpack === stableCoinInstrumentId.unpack));
    if (stableCoinBalances.length > 0) {
      const fetchOffRampOffer = async () => {
        const offers = await ledger.query(
          SettlementOpenOffer,
          {
            offerId: {
              unpack: `${stableCoinInstrumentId.unpack}@${stableCoinBalances[0].instrument.version}.OffRamp`
            }
          }
        );

        if (offers.length > 0 && offers[0].payload.offerers.map.has(stableCoinBalances[0].instrument.issuer)) {
          setOffRampOffer(offers[0]);
        }
      }

      fetchOffRampOffer();
    }
  }, [ledger, props.accountBalances]);

  const transferModal = isTransferModelOpen &&
    <Modal
      className="simpleModal"
      isOpen={isTransferModelOpen}
      onRequestClose={handleCloseTransferModal}
      contentLabel="Transfer"
    >
      <form id="modalForm">
        <h4>Transfer</h4>
        <label>Receiver</label>
        <input
          type="text"
          // id="accountName"
          // name="accountName"
          style={{ width: "200px" }}
          value={receiver}
          onChange={handleChangeReceiver}
        />
        <label>Amount</label>
        <input
          type="number"
          // id="accountName"
          // name="accountName"
          style={{ width: "200px" }}
          value={amountToTransfer}
          onChange={handleChangeTransferAmount}
        />
        <div className="container-inline">
          <button type="submit" className="button__login" onClick={handleSubmitTransfer}>
            Submit
          </button>
          <button type="button" className="button__login" onClick={handleCloseTransferModal}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>;

  const tableRows: [AccountSummary, JSX.Element[]][] = props.accountBalances.map(accountBalance => {
    const trs = accountBalance.balances.map(balance => {
      const redeemButton =
        (balance.instrument.id.unpack === stableCoinInstrumentId.unpack) && offRampOffer !== undefined &&
          <>&nbsp;&nbsp;<button onClick={handleRedeem}>Redeem</button></>;
      const transferButton = <button onClick={() => handleClickTransfer(balance)}>Transfer</button>

      const trKey = JSON.stringify(
        [
          balance.account.custodian,
          balance.account.id.unpack,
          balance.instrument.depository,
          balance.instrument.issuer,
          balance.instrument.id.unpack,
          balance.instrument.version
        ]
      );
      return (
        <tr key={trKey}>
          <td>
            {
              balance.instrument.id.unpack === stableCoinInstrumentId.unpack &&
              <>
                <Coin />
                &nbsp;&nbsp;
              </>
            }
            <a onClick={() => handleInstrumentClick(balance.instrument)}>
              {`${balance.instrument.id.unpack} ${balance.instrument.version}`}
            </a>
          </td>
          <td>
            <HoverPopUp triggerText={truncateParty(balance.instrument.issuer)} popUpContent={balance.instrument.issuer} />
          </td>
          <td>
            {formatCurrency(new Decimal(balance.unlocked).add(new Decimal(balance.locked)))}
          </td>
          <td>{formatCurrency(balance.unlocked)}{redeemButton}{transferButton}</td>
        </tr>
      );
    });

    return [accountBalance.account, trs];
  });

  return (
    <>
      {
        tableRows.map(row => {
          const [account, trs] = row;
          const accountKey = JSON.stringify([account.view.custodian, account.view.id.unpack]);
          return (
            <div key={accountKey}>
              <div style={{ marginTop: "15px" }}>
                <h4 className="profile__title">{account.view.description}</h4>
                <h5 className="profile__title">Register: {truncateParty(account.view.custodian)}</h5>
                <h5 className="profile__title">Account ID: {account.view.id.unpack}</h5>
              </div>
              <div style={{ margin: "10px", padding: "10px" }}>
                <table className="assets">
                  <thead>
                    <tr>
                      <th style={{width: "25%"}}>Asset</th>
                      <th style={{width: "30%"}}>Issuer</th>
                      <th style={{width: "20%"}}>Balance</th>
                      <th style={{width: "25%"}}>Available</th>
                    </tr>
                  </thead>
                  <tbody>{trs}</tbody>
                </table>
              </div>
            </div>
          );
        })
      }
      {transferModal}
      <Modal
        id="handleCloseMessageModal"
        className="MessageModal"
        isOpen={transferBatchId !== undefined}
        onRequestClose={handleCloseMessageModal}
        // contentLabel="Settlement Modal"
      >
        <>
          <div>
            {error === "" ? (
              <>
                <p style={{ color: "#66FF99", fontSize: "1.5rem", whiteSpace: "pre-line" }}>
                  Transfer instructed successfully. Transaction ID: 
                  <a href={`http://${window.location.host}/settlements#${transferBatchId?.unpack}`}>
                    {transferBatchId?.unpack}
                    {/* {"    "}<BoxArrowUpRight /> */}
                  </a>
                </p>
                
              </>
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
                onClick={handleCloseMessageModal}
              >
                OK
              </button>
            </div>
          </div>
          <p></p>
        </>
      </Modal>
    </>
  ) 
};

