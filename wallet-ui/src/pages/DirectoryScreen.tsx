import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import IdentityCards from "../components/layout/IdentityCards";
import * as damlTypes from "@daml/types";
import { Metadata } from "@daml.js/synfini-instrument-metadata-interface/lib/Synfini/Interface/Instrument/Metadata/Metadata";
import { useWalletUser, useWalletViews, userContext } from "../App";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { CreateEvent } from "@daml/ledger";
import { partyAttributesInstrumentId, sbtCustodian, sbtDepository, sbtIssuer } from "../Configuration";
import { Base } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Base";
import { HoldingSummary, InstrumentSummary } from "@synfini/wallet-views";

const DirectoryScreen: React.FC = () => {
  const ledger = userContext.useLedger();
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();

  const { isLoading } = useAuth0();
  const [instruments, setInstruments] = useState<InstrumentSummary[]>();
  const [metadatas, setMetadatas] = useState<damlTypes.Map<InstrumentKey, CreateEvent<Metadata>>>(damlTypes.emptyMap());
  const [holdings, setHoldings] = useState<damlTypes.Map<InstrumentKey, HoldingSummary>>(damlTypes.emptyMap());

  useEffect(() => {
    const fetchInstruments = async () => {
      if (primaryParty !== undefined && sbtDepository !== undefined && sbtIssuer!== undefined) {
        const resp = await walletClient.getInstruments(
          {
            depository: sbtDepository, 
            issuer: sbtIssuer, 
            id: partyAttributesInstrumentId,
            version: null
          }
        );
        setInstruments(resp);
      }
    };
    fetchInstruments();
  }, [primaryParty, walletClient]);

  useEffect(() => {
    const fetchMetadatas = async () => {
      if (instruments !== undefined) {
        await Promise.all(
          instruments.map(async ins => {
            const instrumentKey = ins.tokenView?.token.instrument
  
            if (instrumentKey !== undefined) {
              const metadataResp = await ledger.query(Metadata, { instrument: instrumentKey });
  
              if (metadataResp.length === 1) {
                setMetadatas(currentMetadatas => currentMetadatas.set(instrumentKey, metadataResp[0]));
              }
            }
          })
        );
      }
    };

    fetchMetadatas();
  }, [ledger, instruments]);

  useEffect(() => {
    const fetchHoldings = async () => {
      if (instruments !== undefined) {
        await Promise.all(
          instruments.map(async ins => {
            const instrumentKey = ins.tokenView?.token.instrument
  
            if (instrumentKey !== undefined) {
              const holdingsResp = await walletClient.getHoldings(
                {
                  instrument: instrumentKey,
                  account: { custodian: sbtCustodian, owner: null, id: null }
                }
              );
  
              if (holdingsResp.length === 1) {
                setHoldings(currentHoldings => currentHoldings.set(instrumentKey, holdingsResp[0]));
              }
            }
          })
        )
      }
    }

    fetchHoldings();
  }, [ledger, instruments]);

  const summaries = instruments?.flatMap(ins => {
    const instrumentKey = ins.tokenView?.token.instrument;
    if (instrumentKey !== undefined) {
      const metadata = metadatas.get(instrumentKey);
      const holding = holdings.get(instrumentKey);
      if (metadata !== undefined && holding !== undefined) {
        return [{
          instrument: ins,
          metadata: {
            view: metadata.payload,
            cid: metadata.contractId
          },
          holding: {
            view: holding.view
          }
        }];
      }
    }
    return []
  });

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">Synfini Member Directory</h4>
      </div>
      <div>
        <IdentityCards instruments={summaries} />
      </div>
    </PageLayout>
  );
};

export default DirectoryScreen;
