import * as damlTypes from "@daml/types";
import { emptyMap, Map } from "@daml/types";
import { Set } from "@daml.js/97b883cd8a2b7f49f90d5d39c981cf6e110cf1f1c64427a28a6d58ec88c43657/lib/DA/Set/Types";

export function formatCurrency(amountString: string, locale: string): string {
  const amount = parseFloat(amountString);
  
  if (isNaN(amount)) {
    return 'Invalid amount';
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export function formatOptionalCurrency(amount: damlTypes.Optional<string>, locale: string): string {
  if (amount == null) {
    return "N/A"
  } else {
    return formatCurrency(amount, locale);
  }
}

export function nameFromParty(party: string) {
  let name = '';

  if (party === '' || party === undefined) {
      return '';
  }else{
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
    throw new Error('Invalid percentage string');
  }
  const formattedPercentage = (percentage * 100).toFixed(0) + '%';
  return formattedPercentage;
}


export const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n));

export function arrayToSet<T>(elements: T[]): Set<T> {
  const empty: Map<T, {}> = emptyMap();

  return {
    map: elements.reduce((m, x) => m.set(x, {}), empty),
  };
}