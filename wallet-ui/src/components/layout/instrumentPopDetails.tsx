// import React, { useState } from "react";
import { WalletViewsClient } from "@synfini/wallet-views";
import { useContext, useEffect, useState } from "react";
import Modal from "react-modal";
import AuthContextStore from "../../store/AuthContextStore";
import { userContext } from "../../App";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { packageStringFromParty } from "../Util";
import { ContainerColumn, ContainerColumnField, ContainerDiv, DivBorderRoundContainer } from "./general.styled";

interface InstrumentDetailsProps {
  instrument: any;
  isOpen: boolean;
  handleClose: () => void;
}

export default function InstrumentPopDetails(props: InstrumentDetailsProps) {
  const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || "";
  const [instrument, setInstrument] = useState<InstrumentSummary>();

  const ctx = useContext(AuthContextStore);
  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const { isOpen, handleClose } = props;

  const fetchInstruments = async () => {
    if (props.instrument !== undefined) {
      const resp_instrument = await walletClient.getInstruments(props.instrument);
      setInstrument(resp_instrument.instruments[0]);
      console.log("resp_inst", resp_instrument);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, [props.instrument]);

  console.log("props", props);

  return (
    <>
      <Modal
        id="instrumentModal"
        className="simpleModal"
        isOpen={isOpen}
        onRequestClose={handleClose}
        contentLabel="share SBT"
      >
        {props.instrument !== undefined && (
          <ContainerDiv style={{height: "150px"}}>
            <ContainerColumn>
              <ContainerColumnField style={{ fontSize: "1.5rem"}}>Instrument:</ContainerColumnField>
              <ContainerColumnField style={{ fontSize: "1.5rem"}}>Version:</ContainerColumnField>
            </ContainerColumn>
            <ContainerColumn>
              <ContainerColumnField style={{ fontSize: "1.5rem"}}>{props.instrument.id.unpack}</ContainerColumnField>
              <ContainerColumnField style={{ fontSize: "1.5rem"}}>{props.instrument.version}</ContainerColumnField>
            </ContainerColumn>
          </ContainerDiv>
        )}
        <p></p>
        <p></p>
      </Modal>
    </>
  );
}
