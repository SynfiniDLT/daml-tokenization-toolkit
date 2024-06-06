import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import * as damlTypes from "@daml/types";
import { arrayToSet, flattenObservers, setToArray, toDateTimeString, wait, FirstRender } from "../Util";
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
import { pollDelay } from "../Configuration";
import { InstrumentSummary } from "@synfini/wallet-views";

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

  // State variable used to force the app to fetch contract payloads from the backend
  const [refreshInstrument, setRefreshInstrument] = useState(0);
  // Contract ID of the instrument prior to exercising a choice in it
  const [instrumentDirtyCid, setInstrumentDirtyCid] = useState<damlTypes.ContractId<any> | FirstRender | undefined>("FirstRender");

  // State variable used to force the app to fetch contract payloads from the backend
  const [refreshMetadata, setRefreshMetadata] = useState(0);
  // Contract ID of the metadata prior to exercising a choice in it
  const [metadataDirtyCid, setMetadataDirtyCid] = useState<damlTypes.ContractId<any> | FirstRender | undefined>("FirstRender");

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

  useEffect(() => {
    const fetchInstrument = async () => {
      if (instrumentDirtyCid !== "FirstRender") {
        await wait(pollDelay);
      }
      const instruments = await walletClient.getInstruments(state.instrument);

      if (instruments.length === 1) {
        const ins = instruments[0];
        if (instrumentDirtyCid === "FirstRender" || ins.cid !== instrumentDirtyCid) {
          setInstrumentDirtyCid(undefined);
        } else {
          setRefreshInstrument(r => r + 1);
        }
        if (ins.cid !== instrumentSummary?.cid) {
          setInstrumentSummary(ins);
        }
      } else {
        setInstrumentDirtyCid(undefined);
      }
    };

    if (instrumentDirtyCid !== undefined) {
      fetchInstrument();
    }
  }, [walletClient, ledger, refreshInstrument, instrumentDirtyCid, state.instrument, instrumentSummary?.cid]);

  useEffect(() => {
    const fetchInstrumentDisclosure = async () => {
      if (instrumentSummary !== undefined) {
        const insDisc = await ledger.fetch(Disclosure, instrumentSummary.cid as damlTypes.ContractId<any>);
        if (insDisc !== null) {
          setInstrumentDisclosure(insDisc.payload);
        }
      }
    };

    fetchInstrumentDisclosure();
  }, [instrumentSummary, ledger]);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (metadataDirtyCid !== "FirstRender") {
        await wait(pollDelay);
      }
      const metadatas = await ledger.query(Metadata, { instrument: state.instrument });
      if (metadatas.length === 1) {
        const meta = metadatas[0]
        if (metadataDirtyCid === "FirstRender" || meta.contractId !== metadataDirtyCid) {
          setMetadataDirtyCid(undefined);
        } else {
          setRefreshMetadata(r => r + 1);
        }
        if (meta.contractId !== metadata?.contractId) {
          setMetadata(meta);
        }
      } else {
        setMetadataDirtyCid(undefined);
      }
    };

    if (metadataDirtyCid !== undefined) {
      fetchMetadata();
    }
  }, [ledger, refreshMetadata, metadataDirtyCid, state.instrument, metadata?.contractId]);

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
  }, [metadata, ledger]);

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
            const disc = await ledger.fetch(Disclosure, cid as damlTypes.ContractId<any>);
            setHoldingDisclosure(disc?.payload);
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
    };

    fetchHoldings();
  }, [ledger, state.instrument, instrumentSummary]);

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

    if (instrumentSummary !== undefined) {
      setInstrumentDirtyCid(instrumentSummary.cid);
    }
    if (metadata !== undefined) {
      setMetadataDirtyCid(metadata.contractId);
    }

    const disclosers = arrayToSet([primaryParty]);
    const exerciseArgs = {
      disclosers,
      observersToRemove: {
        _1: obsContext,
        _2: { map: toUnshare },
      },
    };
    // TODO we really need a streaming API to avoid needing the refresh flag
    const removeInstrumentObs =
      metadata !== undefined ? Promise.resolve() :
      ledger.exercise(
        Disclosure.RemoveObservers,
        instrumentSummary.cid as damlTypes.ContractId<any>, exerciseArgs
      ).then(([cid, _]) => {
        if (cid === null) {
          setInstrumentDirtyCid(undefined);
        }
      });
    const removeMetadataObs = metadata === undefined ?
      Promise.resolve() :
      ledger.exercise(Disclosure.RemoveObservers, metadata.contractId as damlTypes.ContractId<any>, exerciseArgs)
        .then(([cid, _]) => {
          if (cid === null) {
            setInstrumentDirtyCid(undefined);
            setMetadataDirtyCid(undefined);
          }
        });
    const removeHoldingsObs =
      nonFungbileHolding !== undefined && holdingDisclosure?.disclosureControllers.map.has(primaryParty) ?
      ledger.exercise(Disclosure.RemoveObservers, nonFungbileHolding.contractId as damlTypes.ContractId<any>, exerciseArgs) :
      Promise.resolve();

    await Promise.all([removeInstrumentObs, removeMetadataObs, removeHoldingsObs])
      .then(() => {
        setMessage("Operation completed with success!");
        setError("");
        setIsModalOpen(true);
      })
      .catch((err) => {
        setInstrumentDirtyCid(undefined);
        setMetadataDirtyCid(undefined);
        setIsModalOpen(true);
        setMessage("");
        setError("Sorry, there was an error removing those parties");
        console.error("Unable to remove observers", err);
      });
  }

  const handleAddObserver = async () => {
    if (primaryParty === undefined || instrumentSummary === undefined || isFungible === undefined) {
      setIsModalOpen(true);
      setMessage("");
      setError("Internal error");
      return;
    }

    if (instrumentSummary !== undefined) {
      setInstrumentDirtyCid(instrumentSummary.cid);
    }
    if (metadata !== undefined) {
      setMetadataDirtyCid(metadata.contractId);
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
      metadata !== undefined ?
      Promise.resolve() :
      ledger.exercise(
        Disclosure.AddObservers,
        instrumentSummary.cid as damlTypes.ContractId<any>,
        exerciseArgs
      );
    const addMetadataObs = metadata === undefined ?
      Promise.resolve() :
      ledger.exercise(Disclosure.AddObservers, metadata.contractId as damlTypes.ContractId<any>, exerciseArgs);
    const addHoldingsObs =
      nonFungbileHolding !== undefined && holdingDisclosure?.disclosureControllers.map.has(primaryParty) ?
      ledger.exercise(Disclosure.AddObservers, nonFungbileHolding.contractId as damlTypes.ContractId<any>, exerciseArgs) :
      Promise.resolve();

    await Promise.all([addInstrumentObs, addMetadataObs, addHoldingsObs])
      .then(() => {
        setMessage("Operation completed with success!");
        setError("");
        setIsModalOpen(true);
      })
      .catch((err) => {
        setInstrumentDirtyCid(undefined);
        setMetadataDirtyCid(undefined);
        setIsModalOpen(true);
        setMessage("");
        setError("Sorry, there was an error sharing with those parties");
        console.error("Error adding observers", err);
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
              <th style={{width: "15%"}}>Issuer</th>
              <td>{state.instrument.issuer}</td>
            </tr>
            <tr>
              <th>Asset type</th>
              <td>{assetTypeDescriptionCapitalised}</td>
            </tr>
            <tr>
              <th>Valid as of</th>
              <td>
                {
                  instrumentSummary.tokenView?.token.validAsOf !== undefined ?
                  toDateTimeString(instrumentSummary.tokenView?.token.validAsOf) :
                  "N/A"
                }
              </td>
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
                <th style={{width: "15%"}}>{attributeName}</th>
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
                <tr key={p}>
                  <td>{p}</td>
                  {canDisclose &&
                    <td>
                      <input
                        type="checkbox"
                        onChange={_ => handleCheckboxChange(p)}
                        disabled={
                          metadataDisclosure !== undefined ?
                            !removableMetadataObservers.map.has(p) :
                            !removableInstrumentObservers.map.has(p)
                        }
                      />
                    </td>
                  }
                </tr>
              )}
            </tbody>
          </table>

          {canDisclose && toUnshare.entriesArray().length > 0 &&
            <>
              <br/>
              <button
                type="button"
                className="button__login"
                onClick={_ => handleRemoveObservers()}
                style={{margin: "auto", width: "200px"}}
              >
                Remove access
              </button>
            </>
          }

          {canDisclose &&
            <p>
              <br/>
              <br/>
              Share asset details:
              <br/>
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
                style={{ width: "100px" }}
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
