// import React, { useState } from "react";
import Modal from "react-modal";

interface InstrumentDetailsProps {
  instrument: any;
  isOpen: boolean;
  handleClose: () => void;
}

export default function InstrumentPopDetails(props: InstrumentDetailsProps) {

  console.log("props",props.instrument)
  
  const { instrument, isOpen, handleClose } = props;

  return (
    <>
      <Modal
        id="instrumentModal"
        className="simpleModal"
        isOpen={isOpen}
        onRequestClose={handleClose}
        contentLabel="share SBT"
      >
        <p>Instrument:{props.instrument.id.unpack}</p>
        <br/>
        <p>Version:{props.instrument.version}</p>
        <p></p>
        <p></p>

      </Modal>
    </>
  );
}
