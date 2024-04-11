import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { PageLoader } from "../components/layout/page-loader";
import { PageLayout } from "../components/PageLayout";
import IdentityCards from "../components/layout/IdentityCards";
import * as damlTypes from "@daml/types";
import { HoldingSummary, InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import { Metadata, View as MetadataView } from "@daml.js/synfini-instrument-metadata-interface/lib/Synfini/Interface/Instrument/Metadata/Metadata";
import { useWalletUser, useWalletViews, userContext } from "../App";
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import { CreateEvent } from "@daml/ledger";
import { arrayToMap } from "../Util";

const DirectoryScreen: React.FC = () => {
  const sbtCustodian = process.env.REACT_APP_PARTIES_SBT_CUSTODIAN;
  const sbtDepository = process.env.REACT_APP_PARTIES_SBT_INSTRUMENT_DEPOSITORY;
  const sbtIssuer = process.env.REACT_APP_PARTIES_SBT_INSTRUMENT_ISSUER;

  const ledger = userContext.useLedger();
  const walletClient = useWalletViews();
  const { primaryParty } = useWalletUser();

  const { isLoading } = useAuth0();
  const [instruments, setInstruments] = useState<InstrumentSummary[]>();
  const [metadatas, setMetadatas] = useState<damlTypes.Map<InstrumentKey, CreateEvent<Metadata>>>(damlTypes.emptyMap());

  useEffect(() => {
    const fetchInstruments = async () => {
      if (primaryParty !== undefined && sbtDepository!== undefined && sbtIssuer!== undefined) {
        const resp = await walletClient.getInstruments(
          {
            depository: sbtDepository, 
            issuer: sbtIssuer, 
            id: { unpack: process.env.REACT_APP_PARTY_ATTRIBUTES_INSTRUMENT_ID || "" },
            version: null
          }
        );
        setInstruments(resp.instruments);
      }
    };
    fetchInstruments();
  }, [primaryParty, sbtDepository, sbtIssuer, walletClient]);

  useEffect(() => {
    const fetchMetadatas = async () => {
      if (instruments !== undefined) {
        const metadatasElems = await Promise.all(
          instruments.map(async ins => {
            const instrumentKey = ins.tokenView?.token.instrument
            let pair: [InstrumentKey, CreateEvent<Metadata>] | undefined = undefined;
  
            if (instrumentKey !== undefined) {
              const metadataResp = await ledger.query(Metadata, { instrument: instrumentKey });
  
              if (metadataResp.length === 1) {
                pair = [instrumentKey, metadataResp[0]];
              }
            }
  
            return pair === undefined ? [] : [pair]
          })
        );

        setMetadatas(arrayToMap(metadatasElems.flatMap(kv => kv)));
      }
    };

    fetchMetadatas();
  }, [primaryParty, sbtDepository, sbtIssuer, ledger, instruments]);

  // TODO cannot fetch Holdings until we relax restrictions on `HoldingsFilter`: account ID, and owner should be optional
  /*
  useEffect(() => {
    const fetchHoldings = async () => {
      if (instruments !== undefined) {
        const holdingsElems = await Promise.all(
          instruments.map(async ins => {
            const instrumentKey = ins.tokenView?.token.instrument
            let pair: [InstrumentKey, HoldingSummary] | undefined = undefined;
  
            if (instrumentKey !== undefined) {
              const metadataResp = await walletClient.getHoldings(
                {instrument: instrumentKey, account: { owner: }}
              );
  
              if (metadataResp.length === 1) {
                pair = [instrumentKey, metadataResp[0]];
              }
            }
  
            return pair === undefined ? [] : [pair]
          })
        );
      }
    }
  }, [primaryParty, sbtDepository, sbtIssuer, walletClient, sbtCustodian])*/

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  console.log('instruments = ', instruments);

  const summaries = instruments?.flatMap(ins => {
    const instrumentKey = ins.tokenView?.token.instrument;
    if (instrumentKey !== undefined) {
      const metadata = metadatas.get(instrumentKey);
      if (metadata !== undefined) {
        return [{
          instrument: ins,
          metadata: {
            view: metadata.payload,
            cid: metadata.contractId
          }
        }];
      }
    }
    return []
  });

  console.log('summaries = ', summaries);

  return (
    <PageLayout>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">SBT Contents</h4>
      </div>
      <div>
        <IdentityCards instruments={summaries} />
      </div>
    </PageLayout>
  );
};

export default DirectoryScreen;
