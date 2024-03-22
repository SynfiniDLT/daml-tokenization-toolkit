import Ledger from "@daml/ledger";
import { AuthContext } from "../store/AuthContextStore";

const fetchDataForUserLedger = async (ctx: AuthContext, ledger: Ledger) => {
  try {
    const user = await ledger.getUser();
    const rights = await ledger.listUserRights();
    ctx.readOnly = (rights.find(right => right.type === "CanActAs" && right.party === user.primaryParty) === undefined);

    if (user.primaryParty !== undefined) {
      ctx.setPrimaryParty(user.primaryParty);
    }
  } catch (err) {
    console.log("error when fetching primary party", err);
  }
};



export { fetchDataForUserLedger };
