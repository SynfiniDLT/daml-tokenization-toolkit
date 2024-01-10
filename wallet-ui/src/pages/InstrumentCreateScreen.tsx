import { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLayout } from "../components/PageLayout";
import {
  ContainerColumn,
  ContainerColumnKey,
  ContainerDiv,
  DivBorderRoundContainer,
} from "../components/layout/general.styled";
import { Party, emptyMap, Map } from "@daml/types";
import { packageStringFromParty } from "../components/Util";
import { Issuer as TokenIssuer } from "@daml.js/issuer-onboarding-token-interface/lib/Synfini/Interface/Onboarding/Issuer/Token/Issuer";
import { Set } from "@daml.js/97b883cd8a2b7f49f90d5d39c981cf6e110cf1f1c64427a28a6d58ec88c43657/lib/DA/Set/Types";
import { v4 as uuid } from "uuid";
import { WalletViewsClient } from "@synfini/wallet-views";
import Modal from "react-modal";

export const InstrumentCreateFormScreen: React.FC = () => {
  const nav = useNavigate();
  const { state } = useLocation();
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);
  const wallet_depository = process.env.REACT_APP_LEDGER_WALLET_DEPOSITORY;
  const wallet_operator = process.env.REACT_APP_LEDGER_WALLET_OPERATOR;

  const [assetNameInput, setAssetNameInput] = useState("");
  const [upperLimitInput, setUpperLimitInput] = useState("");
  const [ipfsInput, setIpfsInput] = useState("");
  const [observerInput, setObserverInput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAssetNameInput = (event: any) => {
    setAssetNameInput(event.target.value);
  };

  const handleUpperLimitInput = (event: any) => {
    setUpperLimitInput(event.target.value);
  };

  const handleIpfsInput = (event: any) => {
    setIpfsInput(event.target.value);
  };

  const handleObserverInput = (event: any) => {
    setObserverInput(event.target.value);
  };

  const handleCloseMessageModal = (path: string) => {
    setIsMessageOpen(!isMessageOpen);
    if (path !== "") nav("/" + path);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (state.issuer.token.cid !== undefined) {
      setIsSubmitting(true);
      let idUUID = uuid();
      let observers: Party[] = [];
      observers.push(wallet_depository + "::" + packageStringFromParty(ctx.primaryParty));
      observers.push(wallet_operator + "::" + packageStringFromParty(ctx.primaryParty));
      observers.push(ctx.primaryParty);
      observers.push(observerInput);

      const desc_instrument = {
        ipfs: ipfsInput,
        upperLimit: upperLimitInput,
      };

      console.log("observers to add", observers)

      await ledger
        .exercise(TokenIssuer.CreateInstrument, state.issuer.token.cid, {
          token: {
            instrument: {
              depository: wallet_depository + "::" + packageStringFromParty(ctx.primaryParty),
              issuer: ctx.primaryParty,
              id: { unpack: assetNameInput },
              version: idUUID,
            },
            description: JSON.stringify(desc_instrument),
            validAsOf: new Date().toISOString(),
          },
          observers: emptyMap<string, Set<Party>>().set("initialObservers", arrayToSet(observers)),
        })
        .then((res) => {
          if (res.length > 1) {
            setMessage("Instrument created with success!");
            setIsMessageOpen(true);
          }
        })
        .catch((err) => {
          setIsMessageOpen(true);
          console.log("Caught error", e);
          setError("Error " + "Contact the Administrator.");
        });
    }
  };

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Create Instrument
      </h3>
      <DivBorderRoundContainer>
        <form onSubmit={handleSubmit}>
          <ContainerDiv>
            <ContainerColumn>
              <ContainerColumnKey>
                Asset Name:
                <input
                  type="text"
                  id="assetName"
                  name="assetName"
                  style={{ width: "150px" }}
                  onChange={handleAssetNameInput}
                />
              </ContainerColumnKey>
              <ContainerColumnKey>
                Upper Limit:
                <input
                  type="text"
                  id="upperLimit"
                  name="upperLimit"
                  style={{ width: "150px" }}
                  onChange={handleUpperLimitInput}
                />
              </ContainerColumnKey>
              <ContainerColumnKey>
                IPFS url:
                <input type="text" id="url" name="url" style={{ width: "150px" }} onChange={handleIpfsInput} />
              </ContainerColumnKey>
              <ContainerColumnKey>
                Observer:
                <input type="text" id="observer" name="observer" style={{ width: "150px" }} onChange={handleObserverInput} />
              </ContainerColumnKey>
              <p></p>
              <button type="submit" className="button__login" disabled={isSubmitting}>Submit</button>
            </ContainerColumn>
            <ContainerColumn></ContainerColumn>
          </ContainerDiv>
        </form>
      </DivBorderRoundContainer>
      <Modal
        id="handleCloseMessageModal"
        className="MessageModal"
        isOpen={isMessageOpen}
        onRequestClose={() => handleCloseMessageModal}
        contentLabel="Create Instrument"
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
                onClick={() => handleCloseMessageModal("issuers")}
              >
                OK
              </button>
            </div>
          </div>
          <p></p>
        </>
      </Modal>
    </PageLayout>
  );
};

function arrayToSet<T>(elements: T[]): Set<T> {
  const empty: Map<T, {}> = emptyMap();
  return {
    map: elements.reduce((m, x) => m.set(x, {}), empty),
  };
}
