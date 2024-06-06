import * as wt from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import fetch from "cross-fetch";
import * as jtv from "@mojotech/json-type-validation";
import  { Result as JtvResult } from "@mojotech/json-type-validation/dist/types/result";
import * as damlTypes from "@daml/types";
import { Account, View as AccountView } from "@daml.js/daml-finance-interface-account/lib/Daml/Finance/Interface/Account/Account";
import { OpenOffer as AccountOpenOffer, View as AccountOpenOfferView } from "@daml.js/synfini-account-onboarding-open-offer-interface/lib/Synfini/Interface/Onboarding/Account/OpenOffer/OpenOffer";
import { Base as Holding, View as HoldingView } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Base";
import { Batch } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Batch";
import { Allocation, Approval, RoutedStep } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Types";
import { Instruction } from "@daml.js/daml-finance-interface-settlement/lib/Daml/Finance/Interface/Settlement/Instruction";
import { Id } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { Set as DamlSet } from "@daml.js/da-set/lib/DA/Set/Types";
import { Instrument } from "@daml.js/daml-finance-interface-instrument-base/lib/Daml/Finance/Interface/Instrument/Base/Instrument";
import { View as TokenView } from "@daml.js/daml-finance-interface-instrument-token/lib/Daml/Finance/Interface/Instrument/Token/Instrument";
import { Issuer as TokenIssuer, View as TokenIssuerView } from "@daml.js/synfini-issuer-onboarding-instrument-token-interface/lib/Synfini/Interface/Onboarding/Issuer/Instrument/Token/Issuer";

export type WalletViewsClientParams = {
  token: string,
  baseUrl: string
}

export type AccountSummary = wt.AccountSummary<damlTypes.ContractId<Account>, AccountView>;
export type AccountOpenOfferSummary = wt.AccountOpenOfferSummary<
  damlTypes.ContractId<AccountOpenOffer>,
  AccountOpenOfferView
>;
export type Balance = wt.Balance;
export type HoldingSummary = wt.HoldingSummary<damlTypes.ContractId<Holding>, HoldingView>
export type SettlementSummary = wt.SettlementSummary<
  Id,
  DamlSet<damlTypes.Party>,
  damlTypes.ContractId<Batch>,
  RoutedStep,
  damlTypes.ContractId<Instruction>,
  Allocation,
  Approval
>;
export type InstrumentSummary = wt.InstrumentSummary<damlTypes.ContractId<Instrument>, TokenView>;
export type IssuerSummary = wt.IssuerSummary<damlTypes.ContractId<TokenIssuer>, TokenIssuerView>;

export class WalletViewsClient {
  private readonly token: string
  private readonly baseUrl: string

  constructor({token, baseUrl} : WalletViewsClientParams) {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  async getAccounts(filter: wt.AccountFilter): Promise<AccountSummary[]> {
    const json = await this.post("/accounts", wt.AccountFilter.encode(filter));
    const { result } = await accountsResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  async getAccountOpenOffers(filter: wt.AccountOpenOffersFilter): Promise<AccountOpenOfferSummary[]> {
    const json = await this.post("/account-open-offers", wt.AccountOpenOffersFilter.encode(filter));
    const { result } = await accountOpenOffersResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  async getBalance(filter: wt.BalanceFilter): Promise<Balance[]> {
    const json = await this.post("/balance", wt.BalanceFilter.encode(filter));
    const { result } = await balanceResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  async getHoldings(filter: wt.HoldingFilter): Promise<HoldingSummary[]> {
    const json = await this.post("/holdings", wt.HoldingFilter.encode(filter));
    const { result } = await holdingsResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  async getSettlements(filter: wt.SettlementsFilter): Promise<SettlementSummary[]> {
    const json = await this.post("/settlements", wt.SettlementsFilter.encode(filter));
    const { result } = await settlementsResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  async getInstruments(filter: wt.InstrumentsFilter): Promise<InstrumentSummary[]> {
    const json = await this.post("/instruments", wt.InstrumentsFilter.encode(filter));
    const { result } = await instrumentsResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  async getIssuers(filter: wt.IssuersFilter): Promise<IssuerSummary[]> {
    const json = await this.post("/issuers", wt.IssuersFilter.encode(filter));
    const { result } = await issuersResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
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
    const resp = await fetch(this.baseUrl + "/wallet-views/v1" + endpoint, fetchParams);
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

function unpackedDecoder<T>(packedDecoder: jtv.Decoder<{unpack: T}>): jtv.Decoder<JtvResult<T, jtv.DecoderError>> {
  return jtv.Decoder
    .unknownJson()
    .map(unknown => ({ unpack: unknown }))
    .andThen(packed => jtv.succeed(packedDecoder.run(packed)))
    .map(result => jtv.Result.map(packed => packed.unpack, result))
}

function unpackedSerializable<T>(
  packedSerializable: damlTypes.Serializable<{unpack: T}>
): damlTypes.Serializable<JtvResult<T, jtv.DecoderError>> {
  return onlyDecodable(unpackedDecoder(packedSerializable.decoder))
}

function onlyDecodable<T>(decoder: jtv.Decoder<T>): damlTypes.Serializable<T> {
  return {
    decoder,
    encode: _ => {
      throw new Error("Unsupported operation: encode")
    }
  }
}

function resultsAsPromise<T>(results: JtvResult<T, jtv.DecoderError>[]): Promise<T[]> {
  return Promise.all(results.map(jtv.Result.asPromise));
}

const accountsResultDecoder = wt.Result(damlTypes.List(unpackedSerializable(wt.AccountSummaryTyped))).decoder;
const accountOpenOffersResultDecoder = wt.Result(
  damlTypes.List(unpackedSerializable(wt.AccountOpenOfferSummaryTyped))
).decoder;
const balanceResultDecoder = wt.Result(damlTypes.List(unpackedSerializable(wt.BalanceTyped))).decoder;
const holdingsResultDecoder = wt.Result(damlTypes.List(unpackedSerializable(wt.HoldingSummaryTyped))).decoder;
const settlementsResultDecoder = wt.Result(damlTypes.List(unpackedSerializable(wt.SettlementSummaryTyped))).decoder;
const instrumentsResultDecoder = wt.Result(damlTypes.List(unpackedSerializable(wt.InstrumentSummaryTyped))).decoder;
const issuersResultDecoder = wt.Result(damlTypes.List(unpackedSerializable(wt.IssuerSummaryTyped))).decoder;
