import { useState } from "react";
import {
  InstrumentSummary,
  AccountSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import Modal from "react-modal";
import { Disclosure } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure";
import { ContractId } from "@daml/types";
import { arrayToSet } from "../Util";
import HoverPopUp from "./hoverPopUp";
import * as damlTypes from "@daml/types";
import { useWalletUser } from "../../App";
import { userContext } from "../../App";

export default function BalanceSbts(
  props: {
    instruments?: InstrumentSummary[];
    account?: AccountSummary;
    instrumentObservers?: damlTypes.Map<damlTypes.ContractId<any>, damlTypes.Party[]>;
  }
) {
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();

  const [cid, setCid] = useState<ContractId<any>>();
  const [operation, setOperation] = useState<string>("");
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
    setOperation("");
  };

  const handleCloseMessageModal = () => {
    setPartiesInput("");
    setIsMessageOpen(!isMessageOpen);
    setOperation("");
  };

  const handleClickOk = async () => {
    setIsMessageOpen(!isMessageOpen);
  };

  const handleShareSBT = (instrument: InstrumentSummary, operation: string) => {
    setPartiesInput("");
    setIsOpen(!isOpen);
    setCid(instrument.cid);
    setOperation(operation);
  };

  const handleSendSBT = async () => {
    if (partiesInput === "") {
      setError("You are required to provide the Party ID.");
      return;
    }
    
    if (primaryParty === undefined) {
      setError("Error primary party is not set");
      return;
    }

    const disclosers = arrayToSet([primaryParty]);
    const observers = arrayToSet([partiesInput]);
    if (
      operation === "add" &&
      cid !== undefined &&
      cid !== ""
    ) {
      await ledger
        .exercise(Disclosure.AddObservers, cid, {
          disclosers,
          observersToAdd: {
            _1: partiesInput,
            _2: observers,
          },
        })
        .then((res) => {
          if (res[1]?.length > 0) {
            setMessage(
              "Operation completed with success! \n SBT was SHARED with party (" +
                partiesInput +
                ")."
            );
            setError("");
          } else {
            setMessage("");
            setError("Operation error! \n error sharing with this party.");
          }
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
    } else if (operation === "remove" && cid !== undefined) {
      ledger
        .exercise(Disclosure.RemoveObservers, cid, {
          disclosers,
          observersToRemove: {
            _1: partiesInput,
            _2: observers,
          },
        })
        .then((res) => {
          if (res[1]?.length > 0) {
            setMessage(
              "Operation completed with success! \n SBT was UNSHARED with party (" +
                partiesInput +
                ")."
            );
            setError("");
          } else {
            setMessage("");
            setError(
              "Operation error! \nSBT was not shared with party(" +
                partiesInput +
                ")."
            );
          }
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

  const trBalances = props.instruments?.map((inst: InstrumentSummary) => {
    const partiesSharedWith: damlTypes.Party[] = props.instrumentObservers?.get(inst.cid) || [];

    return (
      <tr key={inst.cid}>
        <td>
          {inst.pbaView?.instrument.id.unpack} |{" "}{inst.pbaView?.instrument.version}
        </td>
        <td>
          <HoverPopUp 
            triggerText={inst.pbaView?.instrument.issuer.substring(0, 30) + "..."} 
            popUpContent={inst.pbaView?.instrument.issuer} 
          />
        </td>
        <td style={{width: "200px"}}>
        {inst.pbaView?.attributes.entriesArray().map(kv =>
          <>
            {`${kv[0]} | ${kv[1]}`}
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
            onClick={() => handleShareSBT(inst, "add")}
          >
            Share SBT
          </button>

          <button
            type="button"
            className="button__login"
            style={{ width: "120px" }}
            onClick={() => handleShareSBT(inst, "remove")}
          >
            Unshare SBT
          </button>
        </td>
      </tr>
    );
  });

  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h5 className="profile__title">SBT</h5>
      </div>

      {props.instruments?.length === 0 ? (
        <p>There is no balance for this account.</p>
      ) : (
        <table id="assets">
          <thead>
            <tr>
              <th>
                SBT ID
              </th>
              <th>
                Issuer
              </th>
              <th>
                Attributes 
              </th>
              <th>
                Organizations shared with
              </th>
              <th>#</th>
            </tr>
          </thead>
          <tbody>{trBalances || []}</tbody>
        </table>
      )}
      <Modal
        id="shareSbtModal"
        className="simpleModal"
        isOpen={isOpen}
        onRequestClose={handleCloseModal}
        contentLabel="share SBT"
      >
        <>
          <h4 style={{ color: "white", fontSize: "1.5rem" }}>
            {operation === "add" ? "Share" : "Unshare"} SBT
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
              onClick={handleSendSBT}
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
