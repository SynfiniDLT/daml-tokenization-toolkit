import { Set as DamlSet } from "@daml.js/da-set/lib/DA/Set/Types";
import { View as HoldingView } from "@daml.js/daml-finance-interface-holding/lib/Daml/Finance/Interface/Holding/Base";
import { View as DisclosureView } from "@daml.js/daml-finance-interface-util/lib/Daml/Finance/Interface/Util/Disclosure";
import { View as MetadataView } from "@daml.js/synfini-instrument-metadata-interface/lib/Synfini/Interface/Instrument/Metadata/Metadata";
import { InstrumentSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import * as damlTypes from "@daml/types";
import Decimal from "decimal.js";

export function formatCurrency(amount: damlTypes.Decimal | Decimal): string {
  let amountDecimal: Decimal;
  if (typeof amount === "string") {
    try {
      amountDecimal = new Decimal(amount);
    } catch (e: any) {
      return "Invalid amount"
    }
  } else {
    amountDecimal = amount;
  }

  return amountDecimal.toFixed(amountDecimal.decimalPlaces());
}

export function formatOptionalCurrency(amount: damlTypes.Optional<damlTypes.Decimal | Decimal>): string {
  if (amount === null) {
    return "N/A";
  } else {
    return formatCurrency(amount);
  }
}

export function truncateParty(party: damlTypes.Party) {
  const splitted = party.split("::");

  if (splitted.length === 2) {
    if (splitted[1].length > 15) {
      return `${splitted[0]}::${splitted[1].substring(0, 10)}...${splitted[1].substring(splitted[1].length - 5)}`
    }
  }
  console.warn(`Malformed party ID: "${party}"`);
  return party;
}

export const toDateTimeString = (inputDate: damlTypes.Time) => {
  return new Date(inputDate).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h12"
  });
};

export const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n));

export function arrayToSet<T>(elements: T[]): DamlSet<T> {
  const empty: damlTypes.Map<T, {}> = damlTypes.emptyMap();

  return {
    map: elements.reduce((m, x) => m.set(x, {}), empty),
  };
}

export function arrayToMap<K, V>(elements: [K, V][]): damlTypes.Map<K, V> {
  const empty: damlTypes.Map<K, V> = damlTypes.emptyMap();

  return elements.reduce((m, [k, v]) => m.set(k, v), empty);
}

export function flattenObservers(observers: damlTypes.Map<string, DamlSet<damlTypes.Party>>): damlTypes.Party[] {
  const observersArray = observers
    .entriesArray()
    .flatMap(([_, obs]) => setToArray(obs));

  return setToArray(arrayToSet(observersArray)); // Remove any duplicates by converting to set
}

export function setToArray<T>(set: DamlSet<T>): T[] {
  return set.map.entriesArray().map(([x, _]) => x);
}

// React does not copy down the functions available on state variables, so we use this workaround to add these methods
// back onto the `Map` instance
export function repairMap<K, V>(map: damlTypes.Map<K, V>) {
  const mapProtoType = Object.getPrototypeOf(damlTypes.emptyMap<K, V>());
  if (Object.getPrototypeOf(map) !== mapProtoType) {
    Object.setPrototypeOf(map, mapProtoType);
  }
}

export type MetadataSummary = {
  cid: damlTypes.ContractId<any>;
  view: MetadataView;
  disclosureView?: DisclosureView;
}

export type InstrumentMetadataSummary = {
  instrument: InstrumentSummary;
  metadata: MetadataSummary;
  holding: {
    view: HoldingView
  }
};

// Type used to indicate that the page is on its first render and therefore data must be fetched from the backend
export type FirstRender = "FirstRender";
