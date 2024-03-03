import * as fs from 'fs';
import { WalletViewsClient } from '.';
import * as DamlTypes from '@daml/types';

let alice: DamlTypes.Party;
let aliceAccountId = "alice@custodian";
let custodian: DamlTypes.Party;
let issuer: DamlTypes.Party;
let depository: DamlTypes.Party;
let aliceClient: WalletViewsClient;

function generateToken(user: string): string {
  const header = {};
  const payload = {
    aud: "unusedAudience",
    sub: user
  };
  const signature = "unusedsignature";
  const encode = (data: object) => btoa(JSON.stringify(data));
  return encode(header) + "." + encode(payload) + "." + signature;
}

function findParty(parties: any, label: string): DamlTypes.Party {
  const partiesList : any[] = parties.parties;
  return partiesList.find(p => p.label == label).partyId;
}

beforeAll(() => {
  const allocatePartiesOutput = JSON.parse(fs.readFileSync('.dops/parties.json', 'utf-8'));
  alice = findParty(allocatePartiesOutput, 'alice');
  custodian = findParty(allocatePartiesOutput, 'custodian');
  issuer = findParty(allocatePartiesOutput, 'issuer');
  depository = findParty(allocatePartiesOutput, 'depository');

  if (process.env.WALLET_VIEWS_PORT === undefined) {
    throw Error('WALLET_VIEWS_PORT not defined');
  }

  aliceClient = new WalletViewsClient({
    baseUrl: 'http://localhost:' + process.env.WALLET_VIEWS_PORT,
    token: generateToken('alice')
  });
});

test('Lists accounts', async () => {
  const resp = await aliceClient.getAccounts({custodian: null, owner: alice});
  expect(resp.accounts.length).toEqual(1);
  let account = resp.accounts[0];
  expect(account.view.owner).toEqual(alice);
  expect(account.view.id.unpack).toEqual(aliceAccountId);
});

test('Returns balances', async () => {
  const resp = await aliceClient.getBalance({
    account: { owner: alice, custodian, id: { unpack: aliceAccountId } }
  });
  expect(resp.balances.length).toEqual(1);
  let balance = resp.balances[0];
  expect(balance.unlocked).toEqual("100000.0");
  expect(balance.instrument.issuer).toEqual(issuer);
});

test('Returns holdings', async () => {
  const resp = await aliceClient.getHoldings({
    account: { owner: alice, custodian, id: { unpack: aliceAccountId } },
    instrument: { issuer, depository, id: { unpack: "Instrument1" }, version: "0" }
  });
  expect(resp.holdings.length).toEqual(1);
  const holding = resp.holdings[0];
  expect(holding.view.amount).toEqual("100000.0");
  expect(holding.view.instrument.issuer).toEqual(issuer);
});

test('Returns settlements', async () => {
  const resp = await aliceClient.getSettlements({
    before: null,
    limit: "10"
  });
  expect(resp.settlements.length).toEqual(1);
  const settlement = resp.settlements[0];
  expect(settlement.steps.length).toEqual(1);
  const step = settlement.steps[0];
  expect(step.routedStep.quantity.amount).toEqual("100000.0");
  expect(step.routedStep.quantity.unit.issuer).toEqual(issuer);
});

test('Returns account open offers', async () => {
  const resp = await aliceClient.getAccountOpenOffers({});
  expect(resp.accountOpenOffers.length).toEqual(1);
  const offer = resp.accountOpenOffers[0];
  expect(offer.view.custodian).toEqual(custodian);
});

test('Returns issuers', async () => {
  const resp = await aliceClient.getIssuers({ depository, issuer });
  expect(resp.issuers.length).toEqual(1);
  const issuerSummary = resp.issuers[0];
  expect(issuerSummary.token?.view.issuer).toEqual(issuer);
});
