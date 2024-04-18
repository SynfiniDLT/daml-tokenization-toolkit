import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import {
  InstrumentSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import * as damlTypes from "@daml/types";
import { arrayToSet, flattenObservers, setToArray } from "../Util";
import { useWalletUser, useWalletViews } from "../App";
import { CreateEvent } from "@daml/ledger";
import { Metadata } from "@daml.js/synfini-instrument-metadata-interface/lib/Synfini/Interface/Instrument/Metadata/Metadata";
import { Disclosure, View as DisclosureView } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure"
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import Modal from "react-modal";
import { Base } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Base";
import { Fungible } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Fungible";
import { Transferable } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Transferable";
import { Set as DamlSet } from "@daml.js/da-set/lib/DA/Set/Types";

export type AssetDetailsState = {
  instrument: InstrumentKey
}

const obsContext = "wallet.assetShare";

function observersOnlyInContext(observers: damlTypes.Map<string, DamlSet<damlTypes.Party>>): DamlSet<damlTypes.Party> {
  const otherObservers = arrayToSet(flattenObservers(observers.delete(obsContext)));
  const observersArray = setToArray(
    observers.get(obsContext) || arrayToSet<damlTypes.Party>([])
  ).filter(party => !otherObservers.map.has(party));

  return arrayToSet(observersArray);
}

const AssetDetailsScreen: React.FC = () => {
  const { isLoading } = useAuth0();
  const { state } = useLocation() as { state: AssetDetailsState };
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const walletClient = useWalletViews();

  const [refresh, setRefresh] = useState(0);

  const [nonFungbileHolding, setNonFungibleHolding] = useState<CreateEvent<Base>>();
  const [holdingDisclosure, setHoldingDisclosure] = useState<DisclosureView>();
  const [isFungible, setIsFungible] = useState<boolean>();
  const [isTransferable, setIsTransferable] = useState<boolean>();
  const [instrumentSummary, setInstrumentSummary] = useState<InstrumentSummary>();
  const [metadata, setMetadata] = useState<CreateEvent<Metadata>>();
  const [instrumentDisclosure, setInstrumentDisclosure] = useState<DisclosureView>();
  const [metadataDisclosure, setMetadataDisclosure] = useState<DisclosureView>();
  const [toUnshare, setToUnshare] = useState<damlTypes.Map<damlTypes.Party, {}>>(damlTypes.emptyMap());

  const [partyToShareWith, setPartyToShareWith] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const fetchDisclosure = async (cid: damlTypes.ContractId<Disclosure>) => {
    const disclosure = await ledger.fetch(Disclosure, cid);
    return disclosure?.payload;
  }

  useEffect(() => {
    const fetchInstrument = async () => {
      const instruments = await walletClient.getInstruments({
        depository: state.instrument.depository,
        issuer: state.instrument.issuer,
        id: { unpack: state.instrument.id.unpack },
        version: state.instrument.version,
      });

      if (instruments.instruments.length === 1) {
        setInstrumentSummary(instruments.instruments[0]);
      }
    }

    fetchInstrument();
  }, [walletClient, ledger, refresh, state.instrument]);

  useEffect(() => {
    const fetchInstrumentDisclosure = async () => {
      if (instrumentSummary !== undefined) {
        const insDisc = await ledger.fetch(Disclosure, instrumentSummary.cid as damlTypes.ContractId<any>);
        if (insDisc !== null) {
          setInstrumentDisclosure(insDisc.payload);
        }
      }
    }

    fetchInstrumentDisclosure();
  }, [instrumentSummary, ledger]);

  useEffect(() => {
    const fetchMetadata = async () => {
      const metadatas = await ledger.query(Metadata, { instrument: state.instrument });
      if (metadatas.length === 1) {
        setMetadata(metadatas[0]);
      }
    }

    fetchMetadata();
  }, [ledger, refresh, state.instrument]);

  useEffect(() => {
    const fetchMetadataDisclosure = async () => {
      if (metadata !== undefined) {
        const metaDisc = await ledger.fetch(Disclosure, metadata.contractId as damlTypes.ContractId<any>);
        if (metaDisc !== null) {
          setMetadataDisclosure(metaDisc.payload);
        }
      }
    }
    fetchMetadataDisclosure();
  }, [metadata, ledger, refresh]);

  useEffect(() => {
    const fetchHoldings = async () => {
      const holdings = await ledger.query(Base, { instrument: state.instrument });
      if (holdings.length > 0) {
        const cid = holdings[0].contractId as damlTypes.ContractId<any>;
        const fungible = await ledger.fetch(Fungible, cid);
        if (fungible === null) {
          setIsFungible(false);
          if (holdings.length === 1) {
            setNonFungibleHolding(holdings[0]);
            const disc = await fetchDisclosure(cid);
            setHoldingDisclosure(disc);
          }
        } else {
          setIsFungible(true);
        }
        const transferable = await ledger.fetch(Transferable, cid);
        if (transferable === null) {
          setIsTransferable(false);
        } else {
          setIsTransferable(true);
        }
      }
    }

    fetchHoldings();
  }, [ledger, state.instrument, refresh]);

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  const partiesSharedWith = metadataDisclosure === undefined ?
    flattenObservers(instrumentDisclosure?.observers || damlTypes.emptyMap()) :
    flattenObservers(metadataDisclosure.observers);

  const handleCheckboxChange = (party: damlTypes.Party) => {
    if (toUnshare.has(party)) {
      setToUnshare(current => current.delete(party))
    } else {
      setToUnshare(current => current.set(party, {}));
    }
  };

  const handleRemoveObservers = async () => {
    if (primaryParty === undefined || instrumentSummary === undefined || isFungible === undefined) {
      setIsModalOpen(true);
      setMessage("");
      setError("Waiting for page data, please try again");
      return;
    }

    const disclosers = arrayToSet([primaryParty]);
    const exerciseArgs = {
      disclosers,
      observersToRemove: {
        _1: obsContext,
        _2: { map: toUnshare },
      },
    };
    const removeInstrumentObs =
      metadata === undefined ?
      ledger.exercise(
        Disclosure.RemoveObservers,
        instrumentSummary.cid as damlTypes.ContractId<any>, exerciseArgs
      ) : Promise.resolve();
    const removeMetadataObs = metadata !== undefined ?
      ledger.exercise(Disclosure.RemoveObservers, metadata.contractId as damlTypes.ContractId<any>, exerciseArgs) :
      Promise.resolve();
    const removeHoldingsObs =
      nonFungbileHolding !== undefined && holdingDisclosure?.disclosureControllers.map.has(primaryParty) ?
      ledger.exercise(Disclosure.RemoveObservers, nonFungbileHolding.contractId as damlTypes.ContractId<any>, exerciseArgs) :
      Promise.resolve();

    await Promise.all([removeInstrumentObs, removeMetadataObs, removeHoldingsObs])
      .then((res) => {
        setMessage("Operation completed with success!");
        setError("");
        setIsModalOpen(true);
        setRefresh(refresh + 1);
      })
      .catch((err) => {
        setIsModalOpen(true);
        setMessage("");
        setError(
          "Operation error! \nError while removing the party. \n Error:" +
            JSON.stringify(err.errors[0])
        );
      });
  }

  const handleAddObserver = async () => {
    if (primaryParty === undefined || instrumentSummary === undefined || isFungible === undefined) {
      setIsModalOpen(true);
      setMessage("");
      setError("Internal error");
      return;
    }
    const disclosers = arrayToSet([primaryParty]);
    const exerciseArgs = {
      disclosers,
      observersToAdd: {
        _1: obsContext,
        _2: arrayToSet([partyToShareWith]),
      },
    };
    const addInstrumentObs =
      metadata === undefined ?
      ledger.exercise(
        Disclosure.AddObservers,
        instrumentSummary.cid as damlTypes.ContractId<any>,
        exerciseArgs
      ) : Promise.resolve();
    const addMetadataObs = metadata !== undefined ?
      ledger.exercise(Disclosure.AddObservers, metadata.contractId as damlTypes.ContractId<any>, exerciseArgs) :
      Promise.resolve();
    const addHoldingsObs =
      nonFungbileHolding !== undefined && holdingDisclosure?.disclosureControllers.map.has(primaryParty) ?
      ledger.exercise(Disclosure.AddObservers, nonFungbileHolding.contractId as damlTypes.ContractId<any>, exerciseArgs) :
      Promise.resolve();

    await Promise.all([addInstrumentObs, addMetadataObs, addHoldingsObs])
      .then((res) => {
        setMessage("Operation completed with success!");
        setRefresh(refresh + 1);
        setError("");
        setIsModalOpen(true);
      })
      .catch((err) => {
        setIsModalOpen(true);
        setMessage("");
        setError(
          "Operation error! \nError while adding the party. \n Error:" +
            JSON.stringify(err.errors[0])
        );
      });
  }

  function handleCloseModal(): void {
    setIsModalOpen(false);
    setPartyToShareWith("");
    setToUnshare(damlTypes.emptyMap());
  }

  function handleClickOk(): void {
    setIsModalOpen(false);
    setPartyToShareWith("");
    setToUnshare(damlTypes.emptyMap());
  }

  const assetTypeTerms = [];
  if (isTransferable === true) {
    assetTypeTerms.push("transferable");
  }
  if (isTransferable === false) {
    assetTypeTerms.push("non-transferable");
  }
  if (isFungible === true) {
    assetTypeTerms.push("fungible");
  }
  if (isFungible === false) {
    assetTypeTerms.push("non-fungible");
  }
  if (instrumentSummary?.tokenView !== undefined) {
    if (assetTypeTerms.length > 0) {
      assetTypeTerms[assetTypeTerms.length - 1] =
        assetTypeTerms[assetTypeTerms.length - 1] + " token";
    } else {
      assetTypeTerms.push("token");
    }
  }
  const assetTypeDescription = assetTypeTerms.join(", ");
  const assetTypeDescriptionCapitalised = assetTypeDescription.at(0)?.toUpperCase() + assetTypeDescription.slice(1);

  let canDisclose = false;
  if (metadataDisclosure === undefined) {
    if (instrumentDisclosure !== undefined) {
      canDisclose = primaryParty !== undefined && instrumentDisclosure.disclosureControllers.map.has(primaryParty);
    }
  } else {
    canDisclose = primaryParty !== undefined && metadataDisclosure.disclosureControllers.map.has(primaryParty);
  }

  const removableInstrumentObservers = instrumentDisclosure !== undefined ?
    observersOnlyInContext(instrumentDisclosure.observers) :
    arrayToSet<damlTypes.Party>([]);
  const removableMetadataObservers = metadataDisclosure !== undefined ?
    observersOnlyInContext(metadataDisclosure.observers) :
    arrayToSet<damlTypes.Party>([]);

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Asset Details
      </h3>
      {instrumentSummary !== undefined && instrumentDisclosure !== undefined && (
        <table className="assets">
          <caption>
            <h3 className="profile__title" style={{ marginTop: "10px" }}>
              {`${state.instrument.id.unpack} ${state.instrument.version}`}
            </h3>
            <h5 className="profile__title" style={{ marginTop: "10px", paddingBottom: "10px" }}>
              {instrumentSummary.tokenView?.token.description}
            </h5>
          </caption>
          <tbody>
            <tr>
              <th>Issuer</th>
              <td>{state.instrument.issuer}</td>
            </tr>
            <tr>
              <th>Asset type</th>
              <td>{assetTypeDescriptionCapitalised}</td>
            </tr>
            <tr>
              <th>Valid as of</th>
              <td>{instrumentSummary.tokenView?.token.validAsOf}</td>
            </tr>
            {isFungible === false && nonFungbileHolding !== undefined && (
              <tr>
                <th>Owner</th>
                <td>{nonFungbileHolding.payload.account.owner}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {metadata !== undefined && (
        <table className="assets">
          <caption>
            <h4 className="profile__title" style={{ paddingTop: "30px", paddingBottom: "10px" }}>
              Attributes
            </h4>
          </caption>
          <tbody>
            {metadata.payload.attributes.entriesArray().map(([attributeName, attribute]) =>
              <tr key={attributeName}>
                <th>{attributeName}</th>
                <td>{attribute.attributeValue}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {partiesSharedWith !== undefined && (
        <>
          <table className="assets">
            <caption>
              <h4 className="profile__title" style={{ paddingTop: "30px", paddingBottom: "10px" }}>
                Asset observers
              </h4>
            </caption>
            <thead>
              <tr>
                <th>
                  Party
                </th>
                {canDisclose && <th> Unshare </th>}
              </tr>
            </thead>
            <tbody>
              {partiesSharedWith?.map(p =>
                <>
                  <tr key={p}>
                    <td>{p}</td>
                    {canDisclose &&
                      <td>
                        <input
                          type="checkbox"
                          onChange={_ => handleCheckboxChange(p)}
                          disabled={
                            !removableInstrumentObservers.map.has(p) ||
                            (metadataDisclosure !== undefined && !removableMetadataObservers.map.has(p))
                          }
                        />
                      </td>
                    }
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {canDisclose && toUnshare.entriesArray().length > 0 &&
            <button
              type="button"
              className="button__login"
              onClick={_ => handleRemoveObservers()}
            >
              Remove access
            </button>
          }

          {canDisclose &&
            <p>
              <br/>
              Share asset details:
              <input
                type="text"
                id="partyToShare"
                name="partyToShare"
                value={partyToShareWith}
                style={{ width: "400px" }}
                onChange={event => setPartyToShareWith(event.target.value)}
              />

              <button
                type="button"
                className="button__login"
                onClick={_ => handleAddObserver()}
              >
                Share
              </button>
            </p>
          }

          <Modal
            id="handleCloseMessageModal"
            className="MessageModal"
            isOpen={isModalOpen}
            onRequestClose={_ => handleCloseModal()}
            contentLabel="Share asset details"
          >
            <>
              <div>
                {message !== "" ? (
                  <>
                    <span
                      style={{
                        color: "#66FF99",
                        fontSize: "1.5rem",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {message}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        color: "#FF6699",
                        fontSize: "1.5rem",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {error}
                    </span>
                  </>
                )}
              </div>
              <p></p>
              <div>
                <button
                  type="button"
                  className="button__login"
                  onClick={_ => handleClickOk()}
                >
                  Ok
                </button>
              </div>
              <p></p>
            </>
          </Modal>
        
        </>
      )}
    </PageLayout>
  );
};

export default AssetDetailsScreen;
