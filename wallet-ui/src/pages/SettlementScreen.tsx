// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import Settlements from "../components/layout/settlements";
import { useLocation } from "react-router-dom";
import { useWalletUser, useWalletViews } from "../App";
import { SettlementSummary } from "@synfini/wallet-views";

// TODO this type can probably be simplified
type SettlementScreenState = null | {
  transactionId: null | string
}

const SettlementScreen: React.FC = () => {
  const { state } = useLocation() as { state: SettlementScreenState };
  const { primaryParty } = useWalletUser();
  const walletClient = useWalletViews();

  const { isLoading } = useAuth0();
  const [settlements, setSettlements] = useState<SettlementSummary[]>();
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const fetchSettlements = async () => {
      if (primaryParty !== undefined) {
        const resp = await walletClient.getSettlements({ batchId: null, before: null, limit: null });
        setSettlements(resp);
      }
    };

    fetchSettlements();
  }, [primaryParty, walletClient]);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  let settlementsFiltered = settlements;

  if (state !== null && state.transactionId !== null) {
    const settlement = settlements?.find((settlement) => settlement.batchId.unpack === state.transactionId);
    settlementsFiltered = settlement ? [settlement] : [];
  }

  if (filter !== "" && settlementsFiltered!== undefined) {
    if (filter === "pending") {
      settlementsFiltered = settlementsFiltered.filter(settlement => settlement.execution === null);
    }
    if (filter === "settled") {
      settlementsFiltered = settlementsFiltered.filter(settlement => settlement.execution !== null);
    }
  }

  let transactionPendingStyle = "button__sign-up";
  let transactionSettledStyle = "button__sign-up";
  if (filter === "pending") transactionPendingStyle = "button__sign-up-selected";
  if (filter === "settled") transactionSettledStyle = "button__sign-up-selected";

  return (
    <PageLayout>
      <div>
        <div style={{ marginTop: "15px" }}>
          <h4 className="profile__title">Transactions</h4>
        </div>
        <div>
        <div style={{ marginLeft: "200px",display: "flex", justifyContent: "left"  }} >
          <button type="button" className={transactionPendingStyle} style={{width: "100px"}} onClick={() => setFilter("pending")}>
            Pending
          </button>
          <button type="button" className={transactionSettledStyle} style={{width: "100px"}} onClick={() => setFilter("settled")}>
            Settled
          </button>
        </div>
      </div>
        <Settlements settlements={settlementsFiltered} />
      </div>
    </PageLayout>
  );
};

export default SettlementScreen;
