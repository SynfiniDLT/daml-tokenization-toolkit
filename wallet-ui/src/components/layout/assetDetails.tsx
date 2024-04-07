import { useEffect, useState } from "react";
import {
  AccountSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import Modal from "react-modal";
import { Disclosure } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure";
import { ContractId } from "@daml/types";
import { arrayToSet } from "../../Util";
import HoverPopUp from "./hoverPopUp";
import * as damlTypes from "@daml/types";
import { useWalletUser, useWalletViews } from "../../App";
import { userContext } from "../../App";
import { InstrumentMetadataSummary } from "../../Util";

type Operation = "share" | "unshare";

const obsContext = "wallet.assetShare";

export default function AssetDetails(
  props: {
    instrument: InstrumentMetadataSummary;
    holdingCid?: ContractId<any>
  }
) {
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();

  const [operation, setOperation] = useState<Operation | undefined>();
  const [partiesInput, setPartiesInput] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handlePartiesInput: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setPartiesInput(event.target.value);
  };

  const handleCloseModal = () => {
    setPartiesInput("");
    setIsOpen(!isOpen);
    setOperation(undefined);
  };

  const handleCloseMessageModal = () => {
    setPartiesInput("");
    setIsMessageOpen(!isMessageOpen);
    setOperation(undefined);
  };

  const handleClickOk = async () => {
    setIsMessageOpen(!isMessageOpen);
  };

  const handleShareAsset = (operation: Operation) => {
    setPartiesInput("");
    setIsOpen(!isOpen);
    setOperation(operation);
  };

  const handleSendAsset = async () => {
    if (partiesInput === "") {
      setError("You are required to provide the Party ID.");
      return;
    }

    if (primaryParty === undefined) {
      setError("Error primary party is not set");
      return;
    }

    if (metadata.disclosureView === undefined) {
      setError("Contract observers not visible");
      return;
    }

    const disclosers = arrayToSet([primaryParty]);
    const observers = arrayToSet([partiesInput]);
    if (operation === "share") {
      const exerciseArgs = {
        disclosers,
        observersToAdd: {
          _1: obsContext,
          _2: observers,
        },
      };
      const addInstrumentObs = ledger.exercise(
        Disclosure.AddObservers,
        props.instrument.instrument.cid as ContractId<any>,
        exerciseArgs
      );
      const addMetadataObs = ledger.exercise(Disclosure.AddObservers, props.instrument.metadata.cid, exerciseArgs);
      const addHoldingsObs = props.holdingCid != undefined ?
        ledger.exercise(Disclosure.AddObservers, props.holdingCid, exerciseArgs) :
        Promise.resolve();

      await Promise.all([addInstrumentObs, addMetadataObs, addHoldingsObs])
        .then((res) => {
          setMessage(
            "Operation completed with success! \n SBT was SHARED with party (" +
              partiesInput +
              ")."
          );
          setError("");
          setIsOpen(false);
        })
        .catch((err) => {
          setIsOpen(false);
          setMessage("");
          setError(
            "Operation error! \nError while adding the party. \n Error:" +
              JSON.stringify(err.errors[0])
          );
        });
    } else if (operation === "unshare") {
      const exerciseArgs = {
        disclosers,
        observersToRemove: {
          _1: obsContext,
          _2: observers,
        },
      };
      const removeInstrumentObs = ledger.exercise(
        Disclosure.RemoveObservers,
        props.instrument.instrument.cid as ContractId<any>, exerciseArgs
      );
      const removeMetadataObs = ledger.exercise(Disclosure.RemoveObservers, props.instrument.metadata.cid, exerciseArgs);
      const removeHoldingsObs = props.holdingCid != undefined ?
        ledger.exercise(Disclosure.RemoveObservers, props.holdingCid, exerciseArgs) :
        Promise.resolve();

      await Promise.all([removeInstrumentObs, removeMetadataObs, removeHoldingsObs])
        .then((res) => {
          setMessage(
            "Operation completed with success! \n SBT was UNSHARED with party (" +
              partiesInput +
              ")."
          );
          setError("");
          setIsOpen(false);
        })
        .catch((err) => {
          setIsOpen(false);
          setMessage("");
          setError(
            "Operation error! \nError while removing the party. \n Error:" +
              JSON.stringify(err.errors[0])
          );
        });
    }
    setIsMessageOpen(true);
  };

  const metadata = props.instrument.metadata;
  const partiesSharedWith: damlTypes.Party[] = metadata
    .disclosureView
    ?.observers
    .entriesArray()
    .flatMap(obsEntry => obsEntry[1].map.entriesArray().map(partyEntry => partyEntry[0])) || [];

  const instrumentKey = props.instrument.metadata.view.instrument;
  const trBalances = [(
    <tr key={props.instrument.instrument.cid}>
      <td>
        {instrumentKey.id.unpack} (variant: {instrumentKey.version})
      </td>
      <td>
        <HoverPopUp 
          triggerText={instrumentKey.issuer.substring(0, 30) + "..."} 
          popUpContent={instrumentKey.issuer} 
        />
      </td>
      <td style={{width: "200px"}}>
      {metadata.view.attributes.entriesArray().map(kv =>
        <>
          {`${kv[0]} | ${kv[1].attributeValue}`}
          <br />
        </>
      )}
      </td>
      <td style={{ whiteSpace: "pre-line", width: "350px"}}>
        {partiesSharedWith.map((party, index) => (
          <div key={index} style={{margin: "10px"}}>
            - <HoverPopUp triggerText={party.substring(0,30)+ "..."} popUpContent={party} />
          </div>
        ))}
      </td>
      <td style={{width: "300px"}}>
        <button
          type="button"
          className="button__login"
          style={{ width: "100px" }}
          onClick={() => handleShareAsset("share")}
        >
          Share SBT
        </button>

        <button
          type="button"
          className="button__login"
          style={{ width: "120px" }}
          onClick={() => handleShareAsset("unshare")}
        >
          Unshare SBT
        </button>
      </td>
    </tr>
  )];

  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h5 className="profile__title">SBT</h5>
      </div>

      <table id="assets">
        <thead>
          <tr>
            <th>
              Asset ID
            </th>
            <th>
              Issuer
            </th>
            <th>
              Attributes 
            </th>
            <th>
              Shared with
            </th>
            <th>#</th>
          </tr>
        </thead>
        <tbody>{trBalances}</tbody>
      </table>
      <Modal
        id="shareSbtModal"
        className="simpleModal"
        isOpen={isOpen}
        onRequestClose={handleCloseModal}
        contentLabel="share SBT"
      >
        <>
          <h4 style={{ color: "white", fontSize: "1.5rem" }}>
            {operation === "share" ? "Share" : "Unshare"} SBT
          </h4>
          <form id="modalForm">
            <div style={{ fontSize: "1.5rem" }}>
              <table style={{ width: "300px" }}>
                <tbody>
                  <tr>
                    <td>
                      Party:{" "}
                      <input
                        type="text"
                        id="partyToShare"
                        name="partyToShare"
                        value={partiesInput}
                        style={{ width: "400px" }}
                        onChange={handlePartiesInput}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="button__login"
              onClick={handleSendAsset}
            >
              Send
            </button>
          </form>
        </>
      </Modal>
      <Modal
        id="handleCloseMessageModal"
        className="MessageModal"
        isOpen={isMessageOpen}
        onRequestClose={handleCloseMessageModal}
        contentLabel="share SBT"
      >
        <>
          <div>
            {message !== "" ? (
              <>
                <span
                  style={{
                    color: "#66FF99",
                    fontSize: "1.5rem",
                    whiteSpace: "pre-line",
                  }}
                >
                  {message}
                </span>
              </>
            ) : (
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
              </>
            )}
          </div>
          <p></p>
          <div>
            <button
              type="button"
              className="button__login"
              onClick={handleClickOk}
            >
              Ok
            </button>
          </div>
          <p></p>
        </>
      </Modal>
    </>
  );
}
