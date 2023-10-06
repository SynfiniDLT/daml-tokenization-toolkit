import { useState } from "react";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";

export default function BalanceSbts(props: {
  instruments?: InstrumentSummary[];
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  let trBalances;

  if (props.instruments !== undefined) {
    props.instruments?.forEach((inss: any) => {
      let entity: any = inss.pbaView?.attributes.entriesArray();
      trBalances = (
        <tr>
          <td>
            {inss.pbaView?.instrument.id.unpack} |{" "}
            {inss.pbaView?.instrument.version}
          </td>
          <td>{inss.pbaView?.instrument.depository.substring(0, 30)}</td>
          <td>{inss.pbaView?.instrument.issuer.substring(0, 30)}</td>
          <td>{Array.from(entity, ([key, value]) => `${key} | ${value}`)}</td>
          <td>Button</td>
        </tr>
      );
    });
  }

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
    </>
  );
}
