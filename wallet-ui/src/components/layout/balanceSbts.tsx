import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import AuthContextStore from "../../store/AuthContextStore";
import { userContext } from "../../App";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";
import Modal from "react-modal";
import { Disclosure } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure";
import { Party, Map, emptyMap, Unit, ContractId } from "@daml/types";

export default function BalanceSbts(props: {
  instruments?: InstrumentSummary[];
}) {
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [sendTo, setSendTo] = useState<any>();
  const [partiesInput, setPartiesInput] = useState<string>("");

  const handlePartiesInput = (event: any) => {
    setPartiesInput(event.target.value);
  };

  const handleShareSBT = (obj: any) => {
    setPartiesInput("");
    setIsOpen(!isOpen);
    setSendTo(obj);
  };

  const handleSendSBT = () => {
    console.log("obj send to", JSON.stringify(sendTo));
    console.log("primary party", ctx.primaryParty);
    const disclosers: Map<Party, Unit> = emptyMap();
    const observers: Map<Party, Unit> = emptyMap();
    const cid: ContractId<any> = sendTo.cid;
    ledger
      .exercise(Disclosure.AddObservers, cid, {
        disclosers: { map: disclosers.set(ctx.primaryParty, {}) },
        observersToAdd: {
          _1: partiesInput,
          _2: { map: observers.set(partiesInput, {}) },
        },
      })
      .then((res) => {
        console.log("post send sbt", res);
        setIsOpen(false);
      });
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
              onClick={() => handleShareSBT(inst)}
            >
              Share SBT
            </button>
          </td>
        </tr>
      );
    });
  }

  console.dir(partiesInput);

  return (
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
      <Modal
        id="shareSbtModal"
        className="sbtModal"
        isOpen={isOpen}
        onRequestClose={handleShareSBT}
        contentLabel="share SBT"
      >
        <>
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
                        style={{ width: "200px" }}
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
