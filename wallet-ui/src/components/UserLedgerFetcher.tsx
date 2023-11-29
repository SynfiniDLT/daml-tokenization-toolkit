
const fetchDataForUserLedger = async (ctx:any, ledger:any) => {
  try {
    const user = await ledger.getUser();
    const rights = await ledger.listUserRights();
    const found = rights.find((right:any) => right.type === "CanActAs" && right.party === user.primaryParty);
    ctx.readOnly = found === undefined;

    if (user.primaryParty !== undefined) {
      ctx.setPrimaryParty(user.primaryParty);
    }
  } catch (err) {
    console.log("error when fetching primary party", err);
  }
};



export { fetchDataForUserLedger };
