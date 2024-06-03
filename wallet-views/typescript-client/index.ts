import {
  AccountFilter,
  BalanceFilter,
  HoldingFilter,
  SettlementsFilter,
  InstrumentsFilter,
  AccountOpenOffersFilter,
  IssuersFilter,
  AccountSummaryTyped,
  Result,
  AccountOpenOfferSummaryTyped,
  BalanceTyped,
  HoldingSummaryTyped,
  SettlementSummaryTyped,
  InstrumentSummaryTyped,
  IssuerSummaryTyped
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import fetch from "cross-fetch";
import * as jtv from "@mojotech/json-type-validation";
import * as damlTypes from "@daml/types";

type WalletViewsClientParams = {
  token: string,
  baseUrl: string
}

export class WalletViewsClient {
  private readonly token: string
  private readonly baseUrl: string

  constructor({token, baseUrl} : WalletViewsClientParams) {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  async getAccounts(filter: AccountFilter): Promise<AccountSummaryTyped[]> {
    const json = await this.post("/accounts", AccountFilter.encode(filter));
    const { result } = await Result(damlTypes.List(AccountSummaryTyped)).decoder.runPromise(json);
    return result;
  }

  async getAccountOpenOffers(filter: AccountOpenOffersFilter): Promise<AccountOpenOfferSummaryTyped[]> {
    const json = await this.post("/account-open-offers", AccountOpenOffersFilter.encode(filter));
    const { result } = await Result(damlTypes.List(AccountOpenOfferSummaryTyped)).decoder.runPromise(json);
    return result;
  }

  async getBalance(filter: BalanceFilter): Promise<BalanceTyped[]> {
    const json = await this.post("/balance", BalanceFilter.encode(filter));
    const { result } = await Result(damlTypes.List(BalanceTyped)).decoder.runPromise(json);
    return result;
  }

  async getHoldings(filter: HoldingFilter): Promise<HoldingSummaryTyped[]> {
    const json = await this.post("/holdings", HoldingFilter.encode(filter));
    const { result } = await Result(damlTypes.List(HoldingSummaryTyped)).decoder.runPromise(json);
    return result;
  }

  async getSettlements(filter: SettlementsFilter): Promise<SettlementSummaryTyped[]> {
    const json = await this.post("/settlements", SettlementsFilter.encode(filter));
    const { result } = await Result(damlTypes.List(SettlementSummaryTyped)).decoder.runPromise(json);
    return result;
  }

  async getInstruments(filter: InstrumentsFilter): Promise<InstrumentSummaryTyped[]> {
    const json = await this.post("/instruments", InstrumentsFilter.encode(filter));
    const { result } = await Result(damlTypes.List(InstrumentSummaryTyped)).decoder.runPromise(json);
    return result;
  }

  async getIssuers(filter: IssuersFilter): Promise<IssuerSummaryTyped[]> {
    const json = await this.post("/issuers", IssuersFilter.encode(filter));
    const { result } = await Result(damlTypes.List(IssuerSummaryTyped)).decoder.runPromise(json);
    return result;
  }

  private async post(endpoint: string, requestBody: any): Promise<any> {
    const fetchParams = {
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: "Bearer " + this.token,
        "Content-Type": "application/json"
      },
      method: "post"
    }
    const resp =  await fetch(this.baseUrl + "/wallet-views/v1" + endpoint, fetchParams);
    const json = await resp.json();
    if (resp.ok) {
      return json;
    } else {
      throw {
        status: resp.status,
        message: resp.statusText
      }
    }
  }
}
