export function formatCurrency(amountString: string, locale: string, currencyCode: string): string {
    const amount = parseFloat(amountString);
    
    if (isNaN(amount)) {
      return 'Invalid amount';
    }
  
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
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

  export const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n));