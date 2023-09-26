import * as fs from 'fs';
import { WalletViewsClient } from '.';
import * as DamlTypes from '@daml/types';

let alice: DamlTypes.Party;
let bob: DamlTypes.Party;
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

beforeAll(() => {
  const allocatePartiesOutput = JSON.parse(fs.readFileSync('allocate-parties-output.json', 'utf-8'));
  alice = allocatePartiesOutput.alice;
  bob = allocatePartiesOutput.bob;
  custodian = allocatePartiesOutput.custodian;
  issuer = allocatePartiesOutput.issuer;
  depository = allocatePartiesOutput.depository;

  aliceClient = new WalletViewsClient({
    baseUrl: 'http://localhost:8080',
    token: generateToken("alice")
  });
});

test('Lists accounts', async () => {
  const resp = await aliceClient.getAccounts({owner: alice});
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
    instrument: { issuer, depository, id: { unpack: "Instrument1" }, version: "1" }
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
  expect(settlement.steps.length).toEqual(2);

  const sentByAlice = settlement.steps.filter(step => step.routedStep.sender === alice);
  expect(sentByAlice.length).toEqual(1);
  const step1 = sentByAlice[0];
  expect(step1.routedStep.quantity.amount).toEqual("1.0");
  expect(step1.routedStep.quantity.unit.issuer).toEqual(issuer);
  expect(step1.routedStep.sender).toEqual(alice);

  const sentByBob = settlement.steps.filter(step => step.routedStep.sender === bob);
  expect(sentByBob.length).toEqual(1);
  const step2 = sentByBob[0];
  expect(step2.routedStep.quantity.amount).toEqual("2.0");
  expect(step2.routedStep.quantity.unit.issuer).toEqual(issuer);
  expect(step2.routedStep.sender).toEqual(bob);
});
