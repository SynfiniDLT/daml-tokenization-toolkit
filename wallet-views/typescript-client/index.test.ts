import * as fs from "fs";
import { WalletViewsClient } from ".";
import * as DamlTypes from "@daml/types";

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
  const allocatePartiesOutput = JSON.parse(fs.readFileSync(".dops/parties.json", "utf-8"));
  alice = findParty(allocatePartiesOutput, "alice");
  custodian = findParty(allocatePartiesOutput, "custodian");
  issuer = findParty(allocatePartiesOutput, "issuer");
  depository = findParty(allocatePartiesOutput, "depository");

  if (process.env.WALLET_VIEWS_PORT === undefined) {
    throw Error("WALLET_VIEWS_PORT not defined");
  }

  aliceClient = new WalletViewsClient({
    baseUrl: "http://localhost:" + process.env.WALLET_VIEWS_PORT,
    token: generateToken("alice")
  });
});

test("Lists accounts", async () => {
  const resp = await aliceClient.getAccounts({custodian: null, owner: alice});
  expect(resp.length).toEqual(1);
  let account = resp[0].unpack;
  expect(account.view.owner).toEqual(alice);
  expect(account.view.id.unpack).toEqual(aliceAccountId);
});

test("Returns balances", async () => {
  const resp = await aliceClient.getBalance({
    account: { owner: alice, custodian, id: { unpack: aliceAccountId } }
  });
  expect(resp.length).toEqual(1);
  let balance = resp[0].unpack;
  expect(balance.unlocked).toEqual("1.0000000001");
  expect(balance.instrument.issuer).toEqual(issuer);
});

test("Returns holdings", async () => {
  const resp = await aliceClient.getHoldings({
    account: { owner: alice, custodian, id: { unpack: aliceAccountId } },
    instrument: { issuer, depository, id: { unpack: "Instrument1" }, version: "0" }
  });
  expect(resp.length).toEqual(1);
  const holding = resp[0].unpack;
  expect(holding.view.amount).toEqual("1.0000000001");
  expect(holding.view.instrument.issuer).toEqual(issuer);
});

test("Returns settlements", async () => {
  const resp = await aliceClient.getSettlements({
    before: null,
    limit: "10"
  });
  expect(resp.length).toEqual(1);
  const settlement = resp[0].unpack;
  expect(settlement.steps.length).toEqual(1);
  const step = settlement.steps[0];
  expect(step.routedStep.quantity.amount).toEqual("1.0000000001");
  expect(step.routedStep.quantity.unit.issuer).toEqual(issuer);
});

test("Returns account open offers", async () => {
  const resp = await aliceClient.getAccountOpenOffers({});
  expect(resp.length).toEqual(1);
  const offer = resp[0].unpack;
  expect(offer.view.custodian).toEqual(custodian);
});

test("Returns issuers", async () => {
  const resp = await aliceClient.getIssuers({ depository, issuer });
  expect(resp.length).toEqual(1);
  const issuerSummary = resp[0].unpack;
  expect(issuerSummary.token?.view.issuer).toEqual(issuer);
});
