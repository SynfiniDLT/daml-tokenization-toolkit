import { useState } from "react";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";
import Modal from "react-modal";
import styled from "styled-components";

export default function BalanceSbts(props: {
  instruments?: InstrumentSummary[];
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [sendTo, setSendTo] = useState<any>();
  const [partiesInput, setPartiesInput] = useState<string>('');


  const handlePartiesInput = (event: any) => {
    setPartiesInput(event.target.value);
    
  }

  const handleShareSbt = (obj: any) => {
    setPartiesInput('')
    setIsOpen(!isOpen);
    setSendTo(obj);
  };

  const handleSend = () => {
    console.log("==>", "sending parties to " + JSON.stringify(sendTo));
  }

  const Info = styled.span`
    display: flex;
    flex-direction: column;
    font-size: 1.5rem;
    row-gap: 0.5rem;
    justify-content: left;
  `;


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
              type="button" className="button__login"
              style={{ width: "100px"}}
              onClick={() => handleShareSbt(inst)}
            >
              Share SBT
            </button>
          </td>
        </tr>
      );
    });
  }

  console.dir(partiesInput)

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
        onRequestClose={handleShareSbt}
        contentLabel="share SBT"
      >
        <>
          <form id="modalForm">
            {/* <Info> */}
            <div style={{fontSize: '1.5rem'}}>
              <table style={{ width: "300px" }}>
                <tbody>
                  <tr>
                    <td>
                      {/* <FieldCardModal> */}
                        Party:{" "}
                        <input
                          type="text"
                          id="partyToShare"
                          name="partyToShare"
                          value={partiesInput}
                          //ref={partiesInput}
                          style={{ width: "200px" }}
                          onChange={handlePartiesInput}
                        />
                      {/* </FieldCardModal> */}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
                <button type="button" className="button__login" onClick={handleSend}>
                  Send
                </button>
            {/* </Info> */}
          </form>
        </>
      </Modal>
    </>
  );
}
