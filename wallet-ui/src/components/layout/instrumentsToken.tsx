import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { toDateTimeString, truncateParty } from "../../Util";
import { useNavigate } from "react-router-dom";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";

export default function InstrumentsToken(props: { instruments?: InstrumentSummary[] }) {
  const nav = useNavigate();

  const handleInstrumentClick = (instrument: InstrumentKey) => {
    nav("/asset", { state: { instrument } });
  };

  return (
    <>
      <div style={{ margin: "10px", padding: "10px" }}>
        {props.instruments !== undefined && (
          <>
            <div style={{ marginTop: "15px" }}>
              <h4 className="profile__title">Tokens issued</h4>
            </div>
            {props.instruments.length === 0 ? (
              <span style={{ color: "white" }}>You have not created any tokens.</span>
            ) : (
              <table className="assets">
                <thead>
                  <tr>
                    <th style={{width: "25%"}}>Depository</th>
                    <th style={{width: "25%"}}>Issuer</th>
                    <th style={{width: "20%"}}>Asset</th>
                    <th>Valid as of</th>
                  </tr>
                </thead>

                <tbody>
                  {props.instruments.map(instrumentSummary => 
                    instrumentSummary.tokenView !== null && (
                      <tr key={instrumentSummary.cid}>
                        <td>{truncateParty(instrumentSummary.tokenView.token.instrument.issuer)}</td>
                        <td>{truncateParty(instrumentSummary.tokenView.token.instrument.depository)}</td>
                        <td>
                          <a onClick={() => instrumentSummary.tokenView !== null && handleInstrumentClick(instrumentSummary.tokenView.token.instrument)}>
                            {instrumentSummary.tokenView.token.instrument.id.unpack} {instrumentSummary.tokenView.token.instrument.version}
                          </a>
                        </td>
                        <td>{toDateTimeString(instrumentSummary.tokenView.token.validAsOf)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </>
  );
}
