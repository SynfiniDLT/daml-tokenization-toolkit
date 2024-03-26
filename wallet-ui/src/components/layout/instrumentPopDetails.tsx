import { WalletViewsClient } from "@synfini/wallet-views";
import { useContext, useEffect, useState } from "react";
import Modal from "react-modal";
import AuthContextStore from "../../App";
import { ContainerColumn, ContainerColumnField, ContainerDiv } from "./general.styled";
import { BoxArrowUpRight } from "react-bootstrap-icons";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { useWalletViews } from "../../App";

interface InstrumentDetailsProps {
  instrument?: InstrumentKey;
  isOpen: boolean;
  handleClose: () => void;
}
type InstrumentDesc = {
  ipfs: "";
  certificateQuantity: "";
  price: "";
};

export default function InstrumentPopDetails(props: InstrumentDetailsProps) {
  const walletClient = useWalletViews();
  const [instrumentDesc, setInstrumentDesc] = useState<InstrumentDesc>();

  const { isOpen, handleClose } = props;

  const isInstrumentDescEmpty = (instrument: InstrumentDesc): boolean => {
    return Object.values(instrument).every(value => value === "");
  };

  const fetchInstruments = async () => {
    setInstrumentDesc({
      ipfs: "",
      certificateQuantity: "",
      price: "",
    });
    if (props.instrument !== undefined) {
      const resp_instrument = await walletClient.getInstruments(props.instrument);
      if (resp_instrument.instruments[0] !== undefined && resp_instrument.instruments[0].tokenView !== undefined) {
        const description = resp_instrument.instruments[0].tokenView?.token.description;
        if (description !== undefined) {
          setInstrumentDesc(JSON.parse(description));
        }
      }
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, [props.instrument]);

  return (
    <>
      <Modal
        id="instrumentModal"
        className="simpleModal"
        isOpen={isOpen}
        onRequestClose={handleClose}
        contentLabel="Instrument Pop up Details"
      >
        {props.instrument !== undefined && (
          <ContainerDiv style={{ height: "180px" }}>
            <ContainerColumn>
              <ContainerColumnField style={{ fontSize: "1.5rem", textAlign: "right" }}>Instrument:</ContainerColumnField>
              <ContainerColumnField style={{ fontSize: "1.5rem" , textAlign: "right"}}>Version:</ContainerColumnField>
              <ContainerColumnField style={{ fontSize: "1.5rem", textAlign: "right" }}>Price:</ContainerColumnField>
              <ContainerColumnField style={{ fontSize: "1.5rem", textAlign: "right" }}>Ipfs:</ContainerColumnField>
            </ContainerColumn>
            <ContainerColumn>
              <ContainerColumnField style={{ fontSize: "1.5rem", textAlign: "left" }}>{props.instrument.id.unpack}</ContainerColumnField>
              <ContainerColumnField style={{ fontSize: "1.5rem", textAlign: "left", width: "300px" }}>
                {props.instrument.version}
              </ContainerColumnField>
              {instrumentDesc !== undefined && !isInstrumentDescEmpty(instrumentDesc) && (
                <>
                  <ContainerColumnField style={{ fontSize: "1.5rem", textAlign: "left" }}>{instrumentDesc.price}</ContainerColumnField>
                  <ContainerColumnField style={{ fontSize: "1.5rem", textAlign: "left" }}>
                    <a
                      href={`http://${instrumentDesc.ipfs}`}
                      style={{ color: "#66FF99", textDecoration: "underline" }}
                      target="_blank"
                    >
                      {instrumentDesc.ipfs} {"    "}
                      <BoxArrowUpRight />
                    </a>
                  </ContainerColumnField>
                </>
              )}
            </ContainerColumn>
          </ContainerDiv>
        )}
        <p></p>
        <p></p>
      </Modal>
    </>
  );
}
