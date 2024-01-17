import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { BoxArrowUpRight } from "react-bootstrap-icons";
import { toDateTimeString } from "../Util";
import { useNavigate } from "react-router-dom";

export default function InstrumentsToken(props: { instruments?: InstrumentSummary[] }) {
  const nav = useNavigate();

  const handleCreateOffer = (instrument: InstrumentSummary) => {
    nav("/offers/create", { state: { instrument: instrument } });
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
    </>
  );
}
