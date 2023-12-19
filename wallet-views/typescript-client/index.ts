import {
  AccountFilter,
  Accounts,
  BalanceFilter,
  Balances,
  Holdings,
  HoldingFilter,
  Settlements,
  SettlementsFilter,
  InstrumentsFilter,
  Instruments,
  AccountOpenOffersFilter,
  AccountOpenOffers
} from '@daml.js/daml-wallet-views-types/lib/Synfini/Wallet/Api/Types';
import fetch from 'cross-fetch';

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

  async getAccounts(filter: AccountFilter): Promise<Accounts> {
    const json = await this.post("/accounts", AccountFilter.encode(filter));
    return await Accounts.decoder.runPromise(json);
  }

  async getAccountOpenOffers(filter: AccountOpenOffersFilter): Promise<AccountOpenOffers> {
    const json = await this.post("/account-open-offers", AccountOpenOffersFilter.encode(filter));
    return await AccountOpenOffers.decoder.runPromise(json);
  }

  async getBalance(filter: BalanceFilter): Promise<Balances> {
    const json = await this.post("/balance", BalanceFilter.encode(filter));
    return await Balances.decoder.runPromise(json);
  }

  async getHoldings(filter: HoldingFilter): Promise<Holdings> {
    const json = await this.post("/holdings", HoldingFilter.encode(filter));
    return await Holdings.decoder.runPromise(json);
  }

  async getSettlements(filter: SettlementsFilter): Promise<Settlements> {
    const json = await this.post("/settlements", SettlementsFilter.encode(filter));
    return await Settlements.decoder.runPromise(json);
  }

  async getInstruments(filter: InstrumentsFilter): Promise<Instruments> {
    const json = await this.post("/instruments", InstrumentsFilter.encode(filter));
    return await Instruments.decoder.runPromise(json);
  }

  private async post(endpoint: string, requestBody: any): Promise<any> {
    const fetchParams = {
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      method: 'post'
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
