// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import AccountBalances, { AccountBalanceSummary } from "../components/layout/accountBalances";
import { useWalletViews, useWalletUser, userContext } from "../App";
import { AccountSummary } from "@synfini/wallet-views";
import { partyAttributesInstrumentId, partyNameAttribute, sbtDepository, sbtIssuer } from "../Configuration";
import { Metadata } from "@daml.js/synfini-instrument-metadata-interface/lib/Synfini/Interface/Instrument/Metadata/Metadata";
import Decimal from "decimal.js";

const WalletScreen: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const ledger = userContext.useLedger();
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();

  const [accountBalances, setAccountBalances] = useState<AccountBalanceSummary[]>([]);
  const [displayName, setDisplayName] = useState<string>();

  useEffect(() => {
    const fetchAccounts = async () => {
      if (primaryParty !== undefined) {
        const resp = await walletClient.getAccounts({ owner: primaryParty, custodian: null, id: null });
        return resp;
      } else {
        return [];
      }
    };

    const fetchBalances = async (account: AccountSummary) => {
      if (primaryParty !== undefined) {
        const resp = await walletClient.getBalance({
          account: {
            owner: primaryParty,
            custodian: account.view.custodian,
            id: account.view.id,
          },
        });
        return resp;
      }
      return [];
    };

    const fetchAccountBalances = async () => {
      const accounts = await fetchAccounts();
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => {
          const balances = await fetchBalances(account);
          return { account, balances }
        })
      );
      setAccountBalances(accountsWithBalances);
    }
    fetchAccountBalances();
  }, [primaryParty, walletClient]);

  useEffect(() => {
    if (primaryParty === undefined) {
      return;
    }

    const fetchSbt = async () => {
      const sbtBals = accountBalances
        .flatMap(bal =>
          bal.balances.filter(b =>
            b.instrument.depository === sbtDepository &&
            b.instrument.issuer === sbtIssuer &&
            b.instrument.id.unpack === partyAttributesInstrumentId.unpack
          )
        );
      if (sbtBals.length !== 1 || new Decimal(sbtBals[0].unlocked).equals(0)) {
        return;
      }
      const sbtInstruments = await walletClient.getInstruments(sbtBals[0].instrument);
      if (sbtInstruments.length !== 1) {
        return;
      }
      const metadatas = await ledger.query(Metadata, { instrument: sbtBals[0].instrument });
      if (metadatas.length !== 1) {
        return;
      }
      const partyName = metadatas[0].payload.attributes.get(partyNameAttribute);
      if (partyName === undefined) {
        return;
      }
      setDisplayName(partyName.attributeValue);
    };

    fetchSbt();
  }, [primaryParty, walletClient, ledger, accountBalances]);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      {
        isAuthenticated && user !== undefined &&
        <div className="profile-grid">
          <div className="profile__header">
            <img src={user.picture} alt="Profile" className="profile__avatar" />
            <div className="profile__headline">
              <h2 className="profile__title">{displayName !== undefined ? displayName : "Anonymous User"}</h2>
              {primaryParty !== undefined && <span className="profile__description">{primaryParty}</span>}
              <span className="profile__description">{user.email}</span>
            </div>
          </div>
        </div>
      }
      <br/>

      <div>
        <h3 className="profile__title">{isAuthenticated ? "Accounts" : "Please login to view your assets"}</h3>
        <AccountBalances accountBalances={accountBalances} />
      </div>
    </PageLayout>
  );
};

export default WalletScreen;
