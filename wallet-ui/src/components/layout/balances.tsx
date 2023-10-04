import { useState } from "react";
import { Balance, InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { QuestionCircle } from "react-bootstrap-icons";

export default function Balances(props: { balances?: Balance[], instruments?: InstrumentSummary[] }) {

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleClick = () => {
    console.log("show modal");
    setIsOpen(!isOpen);
  };

  let entity: any = [];
  if (props.instruments!== undefined && props.instruments?.length>0){
    entity = props.instruments?.[0].pbaView?.attributes.entriesArray();

  }

  return (
    <>
      <div style={{ marginTop: "15px" }}>
        <h5 className="profile__title">Balances</h5>
      </div>
      
      {props.balances?.length ===0 && (
          <p>There is no balance for this account.</p>
      )}

      {props.balances !== undefined && props.balances?.length >0 && (
        <>
          <table id="customers">
            <thead>
              <tr>
                <th>Instrument | Version<QuestionCircle /></th>
                <th>Depository<QuestionCircle /></th>
                <th>Issuer<QuestionCircle /></th>
                {props.balances[0].account.id.unpack!=='sbt' ?
                <>
                <th>Balance<QuestionCircle /></th>
                <th>Balance Unlocked<QuestionCircle /></th>
                <th>Balance Locked<QuestionCircle /></th>
                </>
                : <>
                  <th>Attributes <QuestionCircle /></th>
                  <th>#</th>
                </>
                }
              </tr>
            </thead>
            <tbody>
              {props.balances.map((balance: Balance, index: number) => (
                <tr key={`${balance.instrument.depository}|${balance.instrument.issuer}|${balance.instrument.id}|${balance.instrument.version}`}>
                  <td>
                    {balance.instrument.id.unpack} {" | "}
                    version: {balance.instrument.version}
                  </td>
                  <td>{balance.instrument.depository.substring(0, 30)}...</td>
                  <td>{balance.instrument.issuer.substring(0, 30)}...</td>
                  {balance.account.id.unpack!=='sbt' ?
                  <>
                    <td>{(parseFloat(balance.unlocked)+ parseFloat(balance.locked)).toFixed(2)}</td>
                    <td>{parseFloat(balance.unlocked).toFixed(2)}</td>
                    <td>{parseFloat(balance.locked).toFixed(2)}</td>
                  </>
                  :<>
                    <td>{Array.from(entity, ([key,value]) => `${key} | ${value}`)}</td>
                    <td><button type="button" className="button__login" style={{width: '100px'}} onClick={handleClick}>
                          Share SBT
                        </button></td>
                  </>
                  }
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
