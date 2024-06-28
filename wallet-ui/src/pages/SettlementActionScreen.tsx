// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import { useLocation } from "react-router-dom";
import { SettlementDetailsAction } from "../components/layout/settlementDetails";
import { DivBorderRoundContainer } from "../components/layout/general.styled";
import { SettlementSummary } from "@synfini/wallet-views";

type SettlementActionScreenState = {
  settlement?: SettlementSummary
}

export const SettlementActionScreen: React.FC = () => {
  const { state } = useLocation() as { state: SettlementActionScreenState } ;
  const { isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <DivBorderRoundContainer>
        {
          state.settlement !== undefined &&
          <SettlementDetailsAction
            requestors={state.settlement.requestors}
            batchId={state.settlement.batchId}
            key={state.settlement.batchCid}
          />
        }
      </DivBorderRoundContainer>
    </PageLayout>
  );
};
