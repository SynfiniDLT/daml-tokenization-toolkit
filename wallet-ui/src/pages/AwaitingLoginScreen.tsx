import React, { useCallback } from "react";
import { userContext } from "../App";

type Props = {
  userId: string;
  onGetPrimaryParty: (party: string) => void;
};

const AwaitingLoginScreen: React.FC<Props> = ({ userId, onGetPrimaryParty }) => {
  // Call this function once the primary party is received
  const getPrimaryParty = useCallback(
    async (party: string) => {
      onGetPrimaryParty(party);
    },
    [onGetPrimaryParty],
  );
  const ledger = userContext.useLedger();

  // TODO use the ledger object to get the primary party for this userId
  return (
    <>
    </>
  );
};

export default AwaitingLoginScreen;
