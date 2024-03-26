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
import { OpenOffer } from "@daml.js/synfini-account-onboarding-open-offer-interface/lib/Synfini/Interface/Onboarding/Account/OpenOffer/OpenOffer";
import AuthContextStore from "../../App";
import { userContext } from "../../App";
import { v4 as uuid } from "uuid";
import { nameFromParty, arrayToSet, arrayToMap } from "../Util";
import HoverPopUp from "./hoverPopUp";
import { useWalletUser } from "../../App";

interface AccountOpenOfferSummaryProps {
  accountOffer: AccountOpenOfferSummary;
}

export default function AccountOfferDetails(props: AccountOpenOfferSummaryProps) {
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const walletOperator = process.env.REACT_APP_PARTIES_WALLET_OPERATOR || "";

  const [accountOffer, setAccountOffer] = useState<AccountOpenOfferSummary>();
  const [accountName, setAccountName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleClick = (accountOffer: AccountOpenOfferSummary) => {
    setIsModalOpen(!isModalOpen);
    setAccountOffer(accountOffer);
  };

  const handleAccountName: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setAccountName(event.target.value);
  };

  const handleCloseMessageModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleConfirm = () => {
    if (primaryParty === undefined) {
      setMessage("");
      setError("Error primary party not set");
      setIsModalOpen(false);
      return;
    }

    if (accountOffer?.cid !== undefined) {
      const idUUID = uuid();
      ledger
        .exercise(
          OpenOffer.Take,
          accountOffer?.cid,
          {
            accountDescription: accountName,
            accountObservers: arrayToMap([["initialObservers", arrayToSet([walletOperator])]]),
            owner: primaryParty,
            id: { unpack: idUUID }
          }
        )
        .then((res) => {
          if (res[1]?.length > 0) {
            setMessage("Operation completed with success! ).");
            setError("");
          } else {
            setMessage("");
            setError("Operation error!");
          }
          setIsModalOpen(false);
        })
        .catch((err) => {
          setIsModalOpen(false);
          setMessage("");
          setError("Operation error! \n \n Error:" + JSON.stringify(err.errors[0]));
        });
    }
    setIsModalOpen(!isModalOpen);
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
            <ContainerColumnKey>Offer Description:</ContainerColumnKey>
            <ContainerColumnKey>Validator:</ContainerColumnKey>
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
          </ContainerColumn>
        </ContainerDiv>
      </CardContainer>
      <Modal
        id="shareSbtModal"
        className="simpleModal"
        isOpen={isModalOpen}
        onRequestClose={handleCloseMessageModal}
        contentLabel="Account Offer Details"
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
