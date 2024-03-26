import { useContext, useEffect, useMemo, useState } from "react";
import AuthContextStore from "../store/AuthContextStore";
import { WalletViewsClient } from "@synfini/wallet-views";
import { Party } from "@daml/types";
import { userContext } from "../App";

const walletViewsBaseUrl = process.env.REACT_APP_API_SERVER_URL || '';

export function useWalletViews(): WalletViewsClient {
  const ctx = useContext(AuthContextStore);
  const walletViewsClient = useMemo(
    () => new WalletViewsClient({token: ctx.token, baseUrl: walletViewsBaseUrl}),
    [ctx.token, walletViewsBaseUrl]
  );
  return walletViewsClient;
}

export function useWalletUser(): { primaryParty?: Party, readOnly: boolean } {
  const ledger = userContext.useLedger();
  const ctx = useContext(AuthContextStore);

  useEffect(() => {
    const fetchPrimaryParty = async () => {
      if (ctx.primaryParty === "" && ctx.token !== "") {
        try {
          const user = await ledger.getUser();
          const rights = await ledger.listUserRights();
          const readOnly = (rights.find(right => right.type === "CanActAs" && right.party === user.primaryParty) === undefined);
          ctx.setReadOnly(readOnly);

          if (user.primaryParty !== undefined) {
            ctx.setPrimaryParty(user.primaryParty);
          }
        } catch (err) {
          console.log("error when fetching primary party 2", err);
        }
      }
    }
    fetchPrimaryParty();
  }, [ctx.token === ""]);

  return {
    primaryParty: ctx.primaryParty === "" ? undefined : ctx.primaryParty,
    readOnly: ctx.readOnly
  }
}
