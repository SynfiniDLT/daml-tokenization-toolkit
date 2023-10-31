import { useState, useContext } from "react";
import AuthContextStore from "../../store/AuthContextStore";
import { userContext } from "../../App";
import {
  InstrumentSummary,
  AccountSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";
import Modal from "react-modal";
import { Disclosure } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure";
import { Party, Map, emptyMap, Unit, ContractId } from "@daml/types";
import { nameFromParty, wait } from "../Util";
import {Instrument as PartyBoundAttributes}  from "@daml.js/daml-pbt/lib/Synfini/Interface/Instrument/PartyBoundAttributes/Instrument";

export default function BalanceSbts(props: {
  instruments?: InstrumentSummary[];
  account?: AccountSummary;
  partyBoundAttributes?: any[];
}) {
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [cid, setCid] = useState<ContractId<any>>();
  const [operation, setOperation] = useState<string>("");
  const [partiesInput, setPartiesInput] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handlePartiesInput = (event: any) => {
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
    ctx.setPrimaryParty("");
    await wait(4000);
    setIsMessageOpen(!isMessageOpen);
  };

  const handleShareSBT = (instrument: InstrumentSummary, operation: string) => {
    setPartiesInput("");
    setIsOpen(!isOpen);
    setCid(instrument.cid);
    setOperation(operation);
  };

  const handleSendSBT = async () => {
    const disclosers: Map<Party, Unit> = emptyMap();
    const observers: Map<Party, Unit> = emptyMap();
    if (partiesInput === "")
      setError("You are required to provide the Party ID.");
    if (
      operation === "add" &&
      cid !== undefined &&
      cid !== "" &&
      partiesInput !== ""
    ) {
      ledger
        .exercise(Disclosure.AddObservers, cid, {
          disclosers: { map: disclosers.set(ctx.primaryParty, {}) },
          observersToAdd: {
            _1: partiesInput,
            _2: { map: observers.set(partiesInput, {}) },
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
    }
    if (operation === "remove" && cid !== undefined) {
      ledger
        .exercise(Disclosure.RemoveObservers, cid, {
          disclosers: { map: disclosers.set(ctx.primaryParty, {}) },
          observersToRemove: {
            _1: partiesInput,
            _2: { map: observers.set(partiesInput, {}) },
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

  let trBalances;

  if (props.instruments !== undefined) {
    props.instruments?.forEach((inst: InstrumentSummary, index) => {
      let entity: any = inst.pbaView?.attributes.entriesArray();
      let partiesSharedWith: string = "";
      if (props.partyBoundAttributes!== undefined && props.partyBoundAttributes.length > 0){

        props.partyBoundAttributes[index].observers.forEach((el: string) => {
          if (el !== ctx.primaryParty && !el.toLowerCase().includes("validator")){
            if (partiesSharedWith===""){
              partiesSharedWith = partiesSharedWith.concat(nameFromParty(el));
            }else{
              partiesSharedWith = partiesSharedWith.concat("\n").concat(nameFromParty(el));
            }
          }
        });
      }

      trBalances = (
        <tr>
          <td>
            {inst.pbaView?.instrument.id.unpack} |{" "}
            {inst.pbaView?.instrument.version}
          </td>
          <td>{"???"}</td>
          <td>{inst.pbaView?.instrument.issuer.substring(0, 30)}</td>
          <td>{Array.from(entity, ([key, value]) => `${key} | ${value}`)}</td>
          <td style={{ whiteSpace: "pre-line"}}>{partiesSharedWith}</td>
          <td>
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
  }

  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h5 className="profile__title">SBT</h5>
      </div>

      {props.instruments?.length === 0 ? (
        <p>There is no balance for this account.</p>
      ) : (
        <table id="customers">
          <thead>
            <tr>
              <th>
                SBT ID
                <QuestionCircle />
              </th>
              <th>
                SBT Name
                <QuestionCircle />
              </th>
              <th>
                Issuer
                <QuestionCircle />
              </th>
              <th>
                Attributes <QuestionCircle />
              </th>
              <th>
                Parties shared with
              </th>
              <th>#</th>
            </tr>
          </thead>
          <tbody>{trBalances}</tbody>
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
          <p>
            <div>
              <button
                type="button"
                className="button__login"
                onClick={handleClickOk}
              >
                Ok
              </button>
            </div>
          </p>
          <p></p>
        </>
      </Modal>
    </>
  );
}
