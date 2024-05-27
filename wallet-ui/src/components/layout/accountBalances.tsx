import { useNavigate } from "react-router-dom";
import { AccountSummary, Balance } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { OpenOffer as SettlementOpenOffer } from "@daml.js/synfini-settlement-open-offer-interface/lib/Synfini/Interface/Settlement/OpenOffer/OpenOffer";
import { formatCurrency, truncateParty } from "../../Util";
import { Coin } from "react-bootstrap-icons";
import HoverPopUp from "./hoverPopUp";
import { useEffect, useState } from "react";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { stableCoinInstrumentId } from "../../Configuration";
import { userContext } from "../../App";
import { CreateEvent } from "@daml/ledger";
import Decimal from "decimal.js";

export type AccountBalanceSummary = {
  account: AccountSummary,
  balances: Balance[]
};

export default function AccountBalances(props: { accountBalances: AccountBalanceSummary[] }) {
  const nav = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false); // TODO remove?
  const ledger = userContext.useLedger();
  const [offRampOffer, setOffRampOffer] = useState<CreateEvent<SettlementOpenOffer, undefined, string>>();

  const handleRedeem = () => {
    if (offRampOffer !== undefined) {
      nav("/offer/accept", { state: { offer: offRampOffer } });
    } else {
      console.warn("Off-ramp offer is not defined");
    }
  };

  const handleInstrumentClick = (instrument: InstrumentKey) => {
    setIsOpen(!isOpen);
    nav("/asset", { state: { instrument } });
  };

  useEffect(() => {
    const stableCoinBalances = props
      .accountBalances
      .flatMap(summary => summary.balances.filter(b => b.instrument.id.unpack === stableCoinInstrumentId.unpack));
    if (stableCoinBalances.length > 0) {
      const fetchOffRampOffer = async () => {
        const offers = await ledger.query(
          SettlementOpenOffer,
          {
            offerId: {
              unpack: `${stableCoinInstrumentId.unpack}@${stableCoinBalances[0].instrument.version}.OffRamp`
            }
          }
        );

        if (offers.length > 0 && offers[0].payload.offerers.map.has(stableCoinBalances[0].instrument.issuer)) {
          setOffRampOffer(offers[0]);
        }
      }

      fetchOffRampOffer();
    }
  }, [ledger, props.accountBalances]);

  const tableRows: [AccountSummary, JSX.Element[]][] = props.accountBalances.map(accountBalance => {
    const trs = accountBalance.balances.map(balance => {
      const actionButton =
        (balance.instrument.id.unpack === stableCoinInstrumentId.unpack) && offRampOffer !== undefined ?
          (<>&nbsp;&nbsp;<button onClick={handleRedeem}>Redeem</button></>) :
          (<></>);

      const trKey = JSON.stringify(
        [
          balance.account.custodian,
          balance.account.id.unpack,
          balance.instrument.depository,
          balance.instrument.issuer,
          balance.instrument.id.unpack,
          balance.instrument.version
        ]
      );
      return (
        <tr key={trKey}>
          <td>
            {balance.instrument.id.unpack === stableCoinInstrumentId.unpack && (
              <>
                <Coin />
                &nbsp;&nbsp;
              </>
            )}
            <a onClick={() => handleInstrumentClick(balance.instrument)}>
              {`${balance.instrument.id.unpack} ${balance.instrument.version}`}
            </a>
          </td>
          <td><HoverPopUp triggerText={truncateParty(balance.instrument.issuer)} popUpContent={balance.instrument.issuer} /></td>
          <td>
            {formatCurrency(new Decimal(balance.unlocked).add(new Decimal(balance.locked)))}
          </td>
          <td>{formatCurrency(balance.unlocked)}{actionButton}</td>
        </tr>
      );
    });

    return [accountBalance.account, trs];
  });

  return (
    <>
      {
        tableRows.map(row => {
          const [account, trs] = row;
          const accountKey = JSON.stringify([account.view.custodian, account.view.id.unpack]);
          return (
            <div key={accountKey}>
              <div style={{ marginTop: "15px" }}>
                <h4 className="profile__title">{account.view.description}</h4>
                <h5 className="profile__title">Register: {truncateParty(account.view.custodian)}</h5>
                <h5 className="profile__title">Account ID: {account.view.id.unpack}</h5>
              </div>
              <div style={{ margin: "10px", padding: "10px" }}>
                <table className="assets">
                  <thead>
                    <tr>
                      <th style={{width: "25%"}}>Asset</th>
                      <th style={{width: "30%"}}>Issuer</th>
                      <th style={{width: "20%"}}>Balance</th>
                      <th style={{width: "25%"}}>Available</th>
                    </tr>
                  </thead>
                  <tbody>{trs}</tbody>
                </table>
              </div>
            </div>
          );
        })
      }
    </>
  ) 
};
