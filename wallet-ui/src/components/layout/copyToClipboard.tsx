import React ,{useState} from "react";
import { Clipboard, ClipboardCheck } from "react-bootstrap-icons";

export default function CopyToClipboard(props: { paramToCopy:any, paramToShow:any }) {

    const [toggleClipboard, setToggleClipboard] = useState(false);
  
    const copyContentClipboard = (param: string) => {
      navigator.clipboard.writeText(param)
      setToggleClipboard(!toggleClipboard);
    }
  

  return (
    <span onClick={() => copyContentClipboard(props.paramToCopy)}>
        {props.paramToShow} {" "}
        {!toggleClipboard ? <Clipboard /> : <><ClipboardCheck /><span> copied!</span></>}
    </span>
  );
};

export function CopyToClipboardFromPopUp(props: { paramToCopy:any }) {

  const [toggleClipboard, setToggleClipboard] = useState(false);

  const copyContentClipboard = (param: string) => {
    navigator.clipboard.writeText(param)
    setToggleClipboard(!toggleClipboard);
  }


return (
  <span onClick={() => copyContentClipboard(props.paramToCopy)}>
    {props.paramToCopy} {" "} {!toggleClipboard ? <Clipboard /> : <><ClipboardCheck /><span> copied!</span></>}
  </span>
);
};

