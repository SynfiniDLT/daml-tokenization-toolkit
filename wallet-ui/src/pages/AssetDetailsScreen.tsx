import { useState, useEffect, ChangeEvent } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import { PageLayout } from "../components/PageLayout";
import { PageLoader } from "../components/layout/page-loader";
import {
  Balance,
  HoldingSummary,
  InstrumentSummary,
} from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import AssetDetails from "../components/layout/assetDetails";
import { Instrument as TokenInstrument }  from "@daml.js/daml-finance-interface-instrument-token/lib/Daml/Finance/Interface/Instrument/Token/Instrument";
import * as damlTypes from "@daml/types";
import { arrayToMap, arrayToSet, flattenObservers } from "../Util";
import { useWalletUser, useWalletViews } from "../App";
import { CreateEvent } from "@daml/ledger";
import { Metadata } from "@daml.js/synfini-instrument-metadata-interface/lib/Synfini/Interface/Instrument/Metadata/Metadata";
import { Disclosure, View as DisclosureView } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure"
import { InstrumentKey } from "@daml.js/daml-finance-interface-types-common/lib/Daml/Finance/Interface/Types/Common/Types";
import Modal from "react-modal";
import { Base } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Base";
import { Fungible } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Fungible";
import { Transferable } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Transferable";

export type AssetDetailsState = {
  instrument: InstrumentKey
}

const obsContext = "wallet.assetShare";

const AssetDetailsScreen: React.FC = () => {
  const { isLoading } = useAuth0();
  const { state } = useLocation() as { state: AssetDetailsState };
  console.log('state = ', state);
  const ledger = userContext.useLedger();
  const { primaryParty } = useWalletUser();
  const walletClient = useWalletViews();

  const [refresh, setRefresh] = useState(0);

  const [nonFungbileHolding, setNonFungibleHolding] = useState<CreateEvent<Base>>();
  const [holdingDisclosure, setHoldingDisclosure] = useState<DisclosureView>();
  const [isFungible, setIsFungible] = useState<boolean>();
  const [isTransferable, setIsTransferable] = useState<boolean>();
  const [instrument, setInstrument] = useState<InstrumentSummary>();
  const [metadata, setMetadata] = useState<CreateEvent<Metadata>>();
  const [assetDisclosure, setAssetDisclosure] = useState<DisclosureView>();
  const [toUnshare, setToUnshare] = useState<damlTypes.Map<damlTypes.Party, {}>>(damlTypes.emptyMap());

  const [partyToShareWith, setPartyToShareWith] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  // const [isMessageOpen, setIsMessageOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

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
    const fetchHoldings = async () => {
      return await ledger.query(Base, { instrument: state.instrument, account: { owner: primaryParty }});
    }

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

    const fetchDisclosure = async (cid: damlTypes.ContractId<Disclosure>) => {
      const disclosure = await ledger.fetch(Disclosure, cid);
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
        const holdings = await fetchHoldings();
        if (holdings.length == 1) {
          const cid = holdings[0].contractId as damlTypes.ContractId<any>;
          const fungible = await ledger.fetch(Fungible, cid);
          if (fungible === null) {
            setIsFungible(false);
            setNonFungibleHolding(holdings[0]);
            const disc = await fetchDisclosure(cid);
            setHoldingDisclosure(disc);
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
  
        const metadata = await fetchMetadata();
        setMetadata(metadata);
        if (metadata !== undefined) {
          const disc = await fetchDisclosure(metadata.contractId as damlTypes.ContractId<any>);
          setAssetDisclosure(disc);
        } else {
          const disc = await fetchDisclosure(instrument.cid as damlTypes.ContractId<any>);
          setAssetDisclosure(disc)
        }
      }
    };

    fetchAll();
  }, [primaryParty, walletClient, ledger, refresh])

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  const partiesSharedWith = assetDisclosure === undefined ? undefined : flattenObservers(assetDisclosure.observers);

  const handleCheckboxChange = (party: damlTypes.Party) => {
    if (toUnshare.has(party)) {
      setToUnshare(toUnshare.delete(party))
    } else {
      setToUnshare(toUnshare.set(party, {}));
    }
  };

  const handleRemoveObservers = async () => {
    if (primaryParty === undefined || instrument === undefined || isFungible === undefined) {
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
      primaryParty === state.instrument.issuer ||
      primaryParty === state.instrument.depository ?
      ledger.exercise(
        Disclosure.RemoveObservers,
        instrument.cid as damlTypes.ContractId<any>, exerciseArgs
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
    console.log(`party "${partyToShareWith}"`);
    if (primaryParty === undefined || instrument === undefined || isFungible === undefined) {
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
      primaryParty === state.instrument.issuer ||
      primaryParty === state.instrument.depository ?
      ledger.exercise(
        Disclosure.AddObservers,
        instrument.cid as damlTypes.ContractId<any>,
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
    console.log('handleCloseModal');
    setIsModalOpen(false);
    setPartyToShareWith("");
    setToUnshare(damlTypes.emptyMap());
  }

  function handleClickOk(): void {
    console.log('handleClickOk');
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
  if (instrument?.tokenView !== undefined) {
    if (assetTypeTerms.length > 0) {
      assetTypeTerms[assetTypeTerms.length - 1] =
        assetTypeTerms[assetTypeTerms.length - 1] + " token";
    } else {
      assetTypeTerms.push("token");
    }
  }
  const assetTypeDescription = assetTypeTerms.join(", ");
  const assetTypeDescriptionCapitalised = assetTypeDescription.at(0)?.toUpperCase() + assetTypeDescription.slice(1);

  const canDisclose = primaryParty !== undefined && (
    primaryParty === state.instrument.issuer ||
    primaryParty === state.instrument.depository ||
    assetDisclosure?.disclosureControllers.map.has(primaryParty));

  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}>
        Asset Details
      </h3>
      {instrument !== undefined && metadata !== undefined && assetDisclosure !== undefined && (
        <table className="assets">
          <caption>
            <h3 className="profile__title" style={{ marginTop: "10px" }}>
              {metadata.payload.instrument.id.unpack}
            </h3>
            <h4 className="profile__title" style={{ marginTop: "10px" }}>
              (variant: {metadata.payload.instrument.version})
            </h4>
            <h5 className="profile__title" style={{ marginTop: "10px", paddingBottom: "10px" }}>
              {instrument.tokenView?.token.description}
            </h5>
          </caption>
          <tbody>
            <tr>
              <th>Issuer</th>
              <td>{instrument.tokenView?.token.instrument.issuer}</td>
            </tr>
            <tr>
              <th>Asset type</th>
              <td>{assetTypeDescriptionCapitalised}</td>
            </tr>
            <tr>
              <th>Valid as of</th>
              <td>{instrument.tokenView?.token.validAsOf}</td>
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
              <tr>
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
                  <tr>
                    <td>{p}</td>
                    {canDisclose &&
                      <td>
                        <input
                          type="checkbox"
                          onChange={_ => handleCheckboxChange(p)}
                          disabled={assetDisclosure?.observers.get(obsContext)?.map.has(p) ? false : true}
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
