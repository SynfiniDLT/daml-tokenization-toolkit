import * as damlTypes from "@daml/types";

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


  export function nameFromParty(party: string) {
    let name = '';

    if (party === '' || party === undefined) {
        return '';
    }else{
        name = party.split("::")[0];
    } 

    return name;
  }

  export function packageStringFromParty(party: string) {
    let name = '';

    if (party === '' || party === undefined) {
        return '';
    }else{
        name = party.split("::")[1];
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