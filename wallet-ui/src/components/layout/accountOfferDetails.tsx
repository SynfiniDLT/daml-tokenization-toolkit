import React, { useContext, useState } from "react";
import Modal from "react-modal";
import {
  CardContainer,
  ContainerColumn,
  ContainerColumnKey,
  ContainerDiv,
  ContainerColumnValue,
} from "./general.styled";
import { AccountOpenOfferSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { OpenOffer } from "@daml.js/account-onboarding-open-offer-interface/lib/Synfini/Interface/Onboarding/Account/OpenOffer/OpenOffer";
import AuthContextStore from "../../store/AuthContextStore";
import { userContext } from "../../App";
import { Party, emptyMap, Map } from "@daml/types";
import { Set } from "@daml.js/97b883cd8a2b7f49f90d5d39c981cf6e110cf1f1c64427a28a6d58ec88c43657/lib/DA/Set/Types";
import { v4 as uuid } from "uuid";
import { packageStringFromParty, nameFromParty, arrayToSet } from "../Util";
import HoverPopUp from "./hoverPopUp";

interface AccountOpenOfferSummaryProps {
  accountOffer: AccountOpenOfferSummary;
}

export default function AccountOfferDetails(props: AccountOpenOfferSummaryProps) {
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();
  const wallet_operaton = process.env.REACT_APP_LEDGER_WALLET_OPERATOR;

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [accountOffer, setAccountOffer] = useState<AccountOpenOfferSummary>();
  const [accountName, setAccountName] = useState("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleClick = (accountOffer: AccountOpenOfferSummary) => {
    setIsOpen(!isOpen);
    setAccountOffer(accountOffer);
  };

  const handleAccountName = (event: any) => {
    setAccountName(event.target.value);
  };

  const handleCloseMessageModal = () => {
    setIsOpen(!isOpen);
  };

  const handleConfirm = () => {
    if (accountOffer?.cid !== undefined) {
      let idUUID = uuid();
      let observers: Party[] = [];
      observers.push(wallet_operaton + "::" + packageStringFromParty(ctx.primaryParty));
      ledger
        .exercise(OpenOffer.Take, accountOffer?.cid, {
          accountDescription: accountName,
          accountObservers: emptyMap<string, Set<Party>>().set("initialObservers", arrayToSet(observers)),
          owner: ctx.primaryParty,
          id: { unpack: idUUID },
        })
        .then((res) => {
          if (res[1]?.length > 0) {
            setMessage("Operation completed with success! ).");
            setError("");
          } else {
            setMessage("");
            setError("Operation error!");
          }
          setIsOpen(false);
        })
        .catch((err) => {
          setIsOpen(false);
          setMessage("");
          setError("Operation error! \n \n Error:" + JSON.stringify(err.errors[0]));
        });
    }
    setIsOpen(!isOpen);
  };


  return (
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
      <CardContainer>
        <ContainerDiv>
          <ContainerColumn>
            <ContainerColumnKey>Offer Name:</ContainerColumnKey>
            <ContainerColumnKey>Validator:</ContainerColumnKey>
            <ContainerColumnKey>Holding Factory:</ContainerColumnKey>
            <p></p>
            <button
              type="button"
              className="button__login"
              style={{ width: "150px" }}
              onClick={() => handleClick(props.accountOffer)}
            >
              Open Account
            </button>
          </ContainerColumn>
          <ContainerColumn>
            <ContainerColumnValue>{props.accountOffer.view.description}</ContainerColumnValue>
            <ContainerColumnValue><HoverPopUp triggerText={nameFromParty(props.accountOffer.view.custodian)} popUpContent={props.accountOffer.view.custodian} /></ContainerColumnValue>
            <ContainerColumnValue><HoverPopUp customLeft="-80%" triggerText={props.accountOffer.view.holdingFactoryCid.substring(0,30)+"..."} popUpContent={props.accountOffer.view.holdingFactoryCid} /></ContainerColumnValue>
          </ContainerColumn>
        </ContainerDiv>
      </CardContainer>
      <Modal
        id="shareSbtModal"
        className="simpleModal"
        isOpen={isOpen}
        onRequestClose={handleCloseMessageModal}
        contentLabel="share SBT"
      >
        <>
          <h4 style={{ color: "white", fontSize: "1.5rem" }}></h4>
          <form id="modalForm">
            <div style={{ fontSize: "1.5rem" }}>
              <table style={{ width: "300px" }}>
                <tbody>
                  {accountOffer!== undefined && 
                <tr>
                    <td style={{width: "95px"}}>Custodian:</td><td>{nameFromParty(accountOffer?.view.custodian)}</td>
                  </tr>
                }
                  <tr>
                    <td style={{width: "95px"}}>Offer Name:</td><td>{accountOffer?.view.description}</td>
                  </tr>
                  <tr>
                    <td style={{width: "95px"}}>Description:
                      </td>
                      <td>

                      <input
                        type="text"
                        id="accountName"
                        name="accountName"
                        style={{ width: "200px" }}
                        value={accountName}
                        onChange={handleAccountName}
                      />
                      </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="container-inline">
              <button type="button" className="button__login" onClick={handleConfirm}>
                Create
              </button>
              <button type="button" className="button__login" onClick={handleCloseMessageModal}>
                Cancel
              </button>
            </div>
          </form>
        </>
      </Modal>
    </>
  );
}
