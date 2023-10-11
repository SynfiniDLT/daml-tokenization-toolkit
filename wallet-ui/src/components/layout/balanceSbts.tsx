import { useState, useContext } from "react";
import AuthContextStore from "../../store/AuthContextStore";
import { userContext } from "../../App";
import {  InstrumentSummary,  AccountSummary} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";
import Modal from "react-modal";
import { Disclosure } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure";
import { Party, Map, emptyMap, Unit, ContractId } from "@daml/types";

export default function BalanceSbts(props: {
  instruments?: InstrumentSummary[];
  account?: AccountSummary;
}) {
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [cid, setCid] = useState<ContractId<any>>();
  const [operation, setOperation] = useState<string>("");
  const [partiesInput, setPartiesInput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handlePartiesInput = (event: any) => {
    setPartiesInput(event.target.value);
  };

  const handleCloseModal = () => {
    setPartiesInput("");
    setIsOpen(!isOpen);
    setOperation("");
  };

  const handleShareSBT = (instrument: InstrumentSummary, operation: string) => {
    setPartiesInput("");
    setIsOpen(!isOpen);
    setCid(instrument.cid);
    setOperation(operation);
  };
  const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n));

  const handleSendSBT = async () => {
    console.log("operation", operation);
    console.log("primary party", ctx.primaryParty);
    const disclosers: Map<Party, Unit> = emptyMap();
    const observers: Map<Party, Unit> = emptyMap();
    if (operation === "add" && cid !== undefined && cid !== '') {
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
    await wait(4000);
    ctx.setPrimaryParty("");
  };

  let trBalances;

  if (props.instruments !== undefined) {
    props.instruments?.forEach((inst: InstrumentSummary) => {
      let entity: any = inst.pbaView?.attributes.entriesArray();
      trBalances = (
        <tr>
          <td>
            {inst.pbaView?.instrument.id.unpack} |{" "}
            {inst.pbaView?.instrument.version}
          </td>
          <td>{inst.pbaView?.instrument.depository.substring(0, 30)}</td>
          <td>{inst.pbaView?.instrument.issuer.substring(0, 30)}</td>
          <td>{Array.from(entity, ([key, value]) => `${key} | ${value}`)}</td>
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
      {error !== "" || message !== "" ? (
        <>
          {error !== "" ? (
            <>
              <div style={{ color: "red", whiteSpace: "pre-line" }}>
                {error}
              </div>
            </>
          ) : (
            <>
              <div style={{ color: "green", whiteSpace: "pre-line" }}>
                {message}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div style={{ marginTop: "15px" }}>
            <h5 className="profile__title">SBT Balances</h5>
          </div>

          {props.instruments?.length === 0 ? (
            <p>There is no balance for this account.</p>
          ) : (
            <table id="customers">
              <thead>
                <tr>
                  <th>
                    Instrument | Version
                    <QuestionCircle />
                  </th>
                  <th>
                    Depository
                    <QuestionCircle />
                  </th>
                  <th>
                    Issuer
                    <QuestionCircle />
                  </th>
                  <th>
                    Attributes <QuestionCircle />
                  </th>
                  <th>#</th>
                </tr>
              </thead>
              <tbody>{trBalances}</tbody>
            </table>
          )}
        </>
      )}

      <Modal
        id="shareSbtModal"
        className="sbtModal"
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
    </>
  );
}
