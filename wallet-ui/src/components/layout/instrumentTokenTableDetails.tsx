import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { toDateTimeString } from "../Util";
import { BoxArrowUpRight } from "react-bootstrap-icons";

interface InstrumentDetailsProps {
  instrument: InstrumentSummary;
}

export default function instrumentTokenTrDetails(props: InstrumentDetailsProps) {
  let json_description;

  if (props.instrument.tokenView !== undefined && props.instrument.tokenView?.token.description !== undefined) {
    const description = props.instrument.tokenView?.token.description;
    json_description = JSON.parse(description);
  }

  return (
    <>
      {props.instrument.tokenView !== null && (
        <>
          <td>{props.instrument.tokenView?.token.instrument.id.unpack.split("-")[0]}</td>
          <td>{props.instrument.tokenView?.token.instrument.id.unpack.split("-")[1]}</td>
          <td>{props.instrument.tokenView?.token.instrument.version}</td>
          <td>
            <a
              href={`http://${json_description.ipfs}`}
              style={{ color: "#66FF99", textDecoration: "underline" }}
              target="_blank"
            >
              {json_description.ipfs} {"    "}
              <BoxArrowUpRight />
            </a>
          </td>

          <td>{json_description.piePointQuantity}</td>
          <td>{json_description.price}</td>
          <td>{toDateTimeString(props.instrument.tokenView?.token.validAsOf)}</td>
        </>
      )}
    </>
  );
}
