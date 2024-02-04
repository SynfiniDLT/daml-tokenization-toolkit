import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { BoxArrowUpRight } from "react-bootstrap-icons";
import { arrayToSet, toDateTimeString } from "../Util";
import { useNavigate } from "react-router-dom";
import { userContext } from "../../App";
import { MinterBurner } from "@daml.js/issuer-onboarding-minter-burner-interface/lib/Synfini/Interface/Onboarding/Issuer/MinterBurner/MinterBurner";
import { Factory as SettlementFactory } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Factory";
import { v4 as uuid } from "uuid";
import Modal from "react-modal";
import { useState } from "react";

export default function InstrumentsToken(props: { instruments?: InstrumentSummary[] }) {
  const nav = useNavigate();
  const ledger = userContext.useLedger();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleCloseModal = (path: string) => {
    setIsModalOpen(!isModalOpen);
    if (path !== "") nav("/" + path);
  };

  const handleCreateOffer = (instrument: InstrumentSummary) => {
    nav("/offers/create", { state: { instrument: instrument } });
  };

  const handlePreMint = async (instrument: InstrumentSummary) => {
    if (instrument.tokenView == null) {
      console.log("Internal error: tokenView is null");
    } else {
      // get piepoint quantity from instrument
      const description = instrument.tokenView?.token.description;
      let json_description = JSON.parse(description);

      const minterBurners = await ledger.query(MinterBurner, {
        issuer: instrument.tokenView.token.instrument.issuer,
        depository: instrument.tokenView.token.instrument.depository,
        // TODO add filter for custodian here
      });

      if (minterBurners.length < 1) {
        console.log("Error: user is not authorised to mint/burn tokens!");
      } else {
        const minterBurner = minterBurners[0];
        // TODO we should have configuration containing the contract ID of the settlement factory
        const settlementFactories = await ledger.query(SettlementFactory);
        if (settlementFactories.length > 0) {
          const settlementFactory = settlementFactories[0];
          const batchId = uuid();
          await ledger
            .exercise(SettlementFactory.Instruct, settlementFactory.contractId, {
              instructors: arrayToSet([instrument.tokenView.token.instrument.issuer]),
              settlers: arrayToSet([instrument.tokenView.token.instrument.issuer]),
              id: { unpack: batchId },
              description: "Pre-mint",
              contextId: null,
              settlementTime: null,
              routedSteps: [
                {
                  custodian: minterBurner.payload.custodian,
                  sender: minterBurner.payload.custodian,
                  receiver: instrument.tokenView.token.instrument.issuer,
                  quantity: {
                    unit: instrument.tokenView.token.instrument,
                    amount: json_description.piePointQuantity, // PIE POINT QUANTITY
                  },
                },
              ],
            })
            .then((res) => {
              setMessage("Pre-mint completed with success!");
              setIsModalOpen(!isModalOpen);
              console.log("resp", res);
            })
            .catch((err) => {
              setError("error when executing pre-mint: " + err.errors[0]);
              setIsModalOpen(!isModalOpen);
            });
        }
      }
    }
  };

  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
            <div style={{ marginTop: "15px" }}>
              <h4 className="profile__title">Instruments</h4>
            </div>
            {props.instruments.length === 0 ? (
              <span style={{ color: "white" }}>There isn't any instrument created by this party.</span>
            ) : (
              <>
                <table id="assets">
                  <thead>
                    <tr>
                      <th>Product Type</th>
                      <th>Product Version</th>
                      <th>Certificate ID(UUID)</th>
                      <th>IPFS(url)</th>
                      <th>PIE Point Quantity</th>
                      <th>Issuing Price</th>
                      <th>Creation Date (dd/mm/yyyy HH:MM:ss:sss)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  {props.instruments.map((instrument: InstrumentSummary, index: number) => {
                    let json_description;

                    if (instrument.tokenView !== undefined && instrument.tokenView?.token.description !== undefined) {
                      const description = instrument.tokenView?.token.description;
                      json_description = JSON.parse(description);
                    }
                    return (
                      <tbody key={instrument.tokenView?.token.instrument.id.unpack}>
                        {instrument.tokenView !== undefined &&
                          instrument.tokenView?.token.description !== undefined && (
                            <tr>
                              <td>{instrument.tokenView?.token.instrument.id.unpack.split("-")[0]}</td>
                              <td>{instrument.tokenView?.token.instrument.id.unpack.split("-")[1]}</td>
                              <td>{instrument.tokenView?.token.instrument.version}</td>
                              <td>
                                <a
                                  href={`http://${json_description.ipfs}`}
                                  style={{ color: "#66FF99", textDecoration: "underline" }}
                                  target="_blank"
                                >
                                  {json_description.ipfs} {"    "}
                                  <BoxArrowUpRight />
                                </a>
                              </td>

                              <td>{json_description.piePointQuantity}</td>
                              <td>{json_description.price}</td>
                              <td>{toDateTimeString(instrument.tokenView?.token.validAsOf)}</td>
                              <td>
                                <button
                                  type="button"
                                  name="createOffer"
                                  style={{ width: "120px" }}
                                  onClick={() => handlePreMint(instrument)}
                                >
                                  Pre-Mint
                                </button>
                                <button
                                  type="button"
                                  name="createOffer"
                                  style={{ width: "120px" }}
                                  onClick={() => handleCreateOffer(instrument)}
                                >
                                  Create Offer
                                </button>
                              </td>
                            </tr>
                          )}
                      </tbody>
                    );
                  })}
                  <tbody></tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
      <Modal
        id="handleCloseMessageModal"
        className="MessageModal"
        isOpen={isModalOpen}
        onRequestClose={() => handleCloseModal}
        contentLabel="Instrument Modal"
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
                onClick={() => handleCloseModal("settlements")}
              >
                OK
              </button>
            </div>
          </div>
          <p></p>
        </>
      </Modal>
    </>
  );
}
