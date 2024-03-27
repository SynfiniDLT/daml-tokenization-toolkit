import { Set } from "@daml.js/da-set/lib/DA/Set/Types";
import * as damlTypes from "@daml/types";

export function formatCurrency(amountString: string, locale: string): string {
  const amount = parseFloat(amountString);

  if (isNaN(amount)) {
    return "Invalid amount";
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export function formatOptionalCurrency(amount: damlTypes.Optional<string>, locale: string): string {
  if (amount == null) {
    return "N/A";
  } else {
    return formatCurrency(amount, locale);
  }
}

// TODO clean this function up
export function nameFromParty(party: string) {
  let name = "";

  if (party === "" || party === undefined) {
    return "";
  } else {
    name = party.split("::")[0];
  }

  return name;
}

export const toDateTimeString = (inputDate: damlTypes.Time) => {
  return new Date(inputDate).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
};

export const formatPercentage = (percentageString: string) => {
  const percentage = parseFloat(percentageString);
  if (isNaN(percentage)) {
    throw new Error("Invalid percentage string");
  }
  const formattedPercentage = (percentage * 100).toFixed(0) + "%";
  return formattedPercentage;
};


export const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n));

export function arrayToSet<T>(elements: T[]): Set<T> {
  const empty: damlTypes.Map<T, {}> = damlTypes.emptyMap();

  return {
    map: elements.reduce((m, x) => m.set(x, {}), empty),
  };
}

export function arrayToMap<K, V>(elements: [K, V][]): damlTypes.Map<K, V> {
  const empty: damlTypes.Map<K, V> = damlTypes.emptyMap();

  return elements.reduce((m, [k, v]) => m.set(k, v), empty);
}

// React does not copy down the functions available on state variables, so we use this workaround to add these methods
// back onto the `Map` instance
export function repairMap<K, V>(map: damlTypes.Map<K, V>) {
  const mapProtoType = Object.getPrototypeOf(damlTypes.emptyMap<K, V>());
  if (Object.getPrototypeOf(map) !== mapProtoType) {
    Object.setPrototypeOf(map, mapProtoType);
  }
}
