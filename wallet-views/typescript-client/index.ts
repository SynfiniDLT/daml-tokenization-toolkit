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
import  { Result as JtvResult } from "@mojotech/json-type-validation/dist/types/result";
import * as damlTypes from "@daml/types";

type WalletViewsClientParams = {
  token: string,
  baseUrl: string
}

const accountsResultDecoder = Result(damlTypes.List(unpackedSerializable(AccountSummaryTyped))).decoder;
const accountOpenOffersResultDecoder = Result(
  damlTypes.List(unpackedSerializable(AccountOpenOfferSummaryTyped))
).decoder;
const balanceResultDecoder = Result(damlTypes.List(unpackedSerializable(BalanceTyped))).decoder;
const holdingsResultDecoder = Result(damlTypes.List(unpackedSerializable(HoldingSummaryTyped))).decoder;
const settlementsResultDecoder = Result(damlTypes.List(unpackedSerializable(SettlementSummaryTyped))).decoder;
const instrumentsResultDecoder = Result(damlTypes.List(unpackedSerializable(InstrumentSummaryTyped))).decoder;
const issuersResultDecoder = Result(damlTypes.List(unpackedSerializable(IssuerSummaryTyped))).decoder;

export class WalletViewsClient {
  private readonly token: string
  private readonly baseUrl: string

  constructor({token, baseUrl} : WalletViewsClientParams) {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  getAccounts = async (filter: AccountFilter) => {
    const json = await this.post("/accounts", AccountFilter.encode(filter));
    const { result } = await accountsResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  getAccountOpenOffers = async (filter: AccountOpenOffersFilter) => {
    const json = await this.post("/account-open-offers", AccountOpenOffersFilter.encode(filter));
    const { result } = await accountOpenOffersResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  getBalance = async (filter: BalanceFilter) => {
    const json = await this.post("/balance", BalanceFilter.encode(filter));
    const { result } = await balanceResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  getHoldings = async (filter: HoldingFilter) => {
    const json = await this.post("/holdings", HoldingFilter.encode(filter));
    const { result } = await holdingsResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  getSettlements = async (filter: SettlementsFilter) => {
    const json = await this.post("/settlements", SettlementsFilter.encode(filter));
    const { result } = await settlementsResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  getInstruments = async (filter: InstrumentsFilter) => {
    const json = await this.post("/instruments", InstrumentsFilter.encode(filter));
    const { result } = await instrumentsResultDecoder.runPromise(json);
    return await resultsAsPromise(result);
  }

  getIssuers = async (filter: IssuersFilter) => {
    const json = await this.post("/issuers", IssuersFilter.encode(filter));
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

function unpackedDecoder<T>(packedDecoder: jtv.Decoder<{unpack: T}>): jtv.Decoder<JtvResult<T, jtv.DecoderError>> {
  return jtv.Decoder
    .unknownJson()
    .map(unknown => ({ unpack: unknown }))
    .andThen(p => {
      console.log("Packed result: ", p);
      console.log("typeof(p)", typeof(p));
      console.log("props of p", Object.getOwnPropertyNames(p));
      return jtv.succeed(packedDecoder.run(p))
    })
    .map(result => jtv.Result.map(r => r.unpack, result))
}

function unpackedSerializable<T>(
  packedSerializable: damlTypes.Serializable<{unpack: T}>
): damlTypes.Serializable<JtvResult<T, jtv.DecoderError>> {
  return onlyDecodable(
    unpackedDecoder(packedSerializable.decoder)
  )
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
