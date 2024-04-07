import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import {
  Balance,
  InstrumentSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AssetDetails from "../components/layout/assetDetails";
import { Instrument as TokenInstrument }  from "@daml.js/daml-finance-interface-instrument-token/lib/Daml/Finance/Interface/Instrument/Token/Instrument";
import * as damlTypes from "@daml/types";
import { arrayToMap } from "../Util";
import { useWalletUser, useWalletViews } from "../App";
import { CreateEvent } from "@daml/ledger";
import { Metadata } from "@daml.js/synfini-instrument-metadata-interface/lib/Synfini/Interface/Instrument/Metadata/Metadata";
import { Disclosure, View as DisclosureView } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure"
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";

export type AssetDetailsState = {
  instrument: InstrumentKey
}

const AssetDetailsScreen: React.FC = () => {
  const { isLoading } = useAuth0();
  const { state } = useLocation() as { state: AssetDetailsState };
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const walletClient = useWalletViews();

  // const [balances, setBalances] = useState<Balance[]>([]);
  const [instrument, setInstrument] = useState<InstrumentSummary>();
  const [metadata, setMetadata] = useState<CreateEvent<Metadata>>();
  const [metadataDisclosure, setMetadataDisclosure] = useState<DisclosureView>();

  // useEffect(() => {
  //   const fetchBalances = async () => {
  //     if (primaryParty !== undefined) {
  //       const resp = await walletClient.getBalance({
  //         account: {
  //           owner: primaryParty,
  //           custodian: state.account.view.custodian,
  //           id: { unpack: state.account.view.id.unpack },
  //         },
  //       });
  //       setBalances(resp.balances);
  //     }
  //   };

  //   fetchBalances();
  // }, [primaryParty, walletClient, state.account.view.custodian, state.account.view.id.unpack]);

  useEffect(() => {
    const fetchInstrument = async () => {
      const instruments = await walletClient.getInstruments({
        depository: state.instrument.depository,
        issuer: state.instrument.issuer,
        id: { unpack: state.instrument.id.unpack },
        version: state.instrument.version,
      });
      if (instruments.instruments.length === 1) {
        return instruments.instruments[0];
      } else {
        return undefined;
      }
    }

    const fetchDisclosure = async (instrumentCid: damlTypes.ContractId<Disclosure>) => {
      const disclosure = await ledger.fetch(Disclosure, instrumentCid);
      return disclosure?.payload;
    }

    const fetchMetadata = async () => {
      const metadatas = await ledger.query(Metadata, { instrument: state.instrument });
      if (metadatas.length === 1) {
        return metadatas[0]
      } else {
        return undefined;
      }
    }

    const fetchAll = async () => {
      const instrument = await fetchInstrument();
      setInstrument(instrument);
      if (instrument !== undefined) {
        const metadata = await fetchMetadata();
        setMetadata(metadata);
        if (metadata !== undefined) {
          const disc = await fetchDisclosure((metadata.contractId as any) as damlTypes.ContractId<Disclosure>);
          setMetadataDisclosure(disc);
        }
      }
    };

    fetchAll();
  }, [primaryParty, walletClient, ledger])

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Asset Details
      </h3>
      {instrument !== undefined && metadata !== undefined && metadataDisclosure !== undefined && (
        <AssetDetails instrument={
          {
            instrument,
            metadata: {
              cid: metadata.contractId,
              view: metadata.payload,
              disclosureView: metadataDisclosure
            }
          }
        } />
      )}
    </PageLayout>
  );
};

export default AssetDetailsScreen;
