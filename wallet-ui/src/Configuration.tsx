// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Id } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { Factory as SettlementFactory } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Factory";
import * as damlTypes from "@daml/types";
import { RouteProvider } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/RouteProvider";

function getRequiredVariable(variable: string): string {
  const value = process.env[variable];
  if (value === undefined) {
    throw Error(`Configuration not provided for: ${variable}`);
  }
  return value;
}

const walletModeVar = process.env.REACT_APP_MODE;
if (walletModeVar !== "investor" && walletModeVar !== "issuer") {
  throw Error(`Unsupported wallet mode: ${walletModeVar}`);
}
export type WalletMode = "investor" | "issuer";
export const walletMode: WalletMode = walletModeVar === "investor" ? "investor" : "issuer";

export const partyAttributesInstrumentId: Id = {
  unpack: getRequiredVariable("REACT_APP_PARTY_ATTRIBUTES_INSTRUMENT_ID")
};
export const partyNameAttribute = getRequiredVariable("REACT_APP_PARTY_ATTRIBUTES_NAME")
export const stableCoinInstrumentId: Id = {
  unpack: getRequiredVariable("REACT_APP_STABLECOIN_INSTRUMENT_ID")
}
export const walletOperator = getRequiredVariable("REACT_APP_PARTIES_WALLET_OPERATOR");
export const sbtCustodian = getRequiredVariable("REACT_APP_PARTIES_SBT_CUSTODIAN");
export const sbtDepository = getRequiredVariable("REACT_APP_PARTIES_SBT_INSTRUMENT_DEPOSITORY");
export const sbtIssuer = getRequiredVariable("REACT_APP_PARTIES_SBT_INSTRUMENT_ISSUER");

export const pollDelay = parseInt(getRequiredVariable("REACT_APP_POLL_DELAY"));
export const maxPolls = parseInt(getRequiredVariable("REACT_APP_POLL_MAX"));

export const settlementFactoryCid = getRequiredVariable("REACT_APP_SETTLEMENT_FACTORY_CID") as damlTypes.ContractId<SettlementFactory>;
export const routeProviderCid = getRequiredVariable("REACT_APP_ROUTE_PROVIDER_CID") as damlTypes.ContractId<RouteProvider>;
