// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SettlementSummary } from "@synfini/wallet-views";
import SettlementDetails from "./settlementDetails";

export default function Settlements(props: { settlements?: SettlementSummary[] }) {
  return (
    <div style={{ margin: "10px", padding: "10px" }}>
      {
        props.settlements !== undefined &&
        props.settlements.map(settlement =>
          <SettlementDetails settlement={settlement} key={settlement.batchCid}></SettlementDetails>
        )
      }
    </div>
  );
}
