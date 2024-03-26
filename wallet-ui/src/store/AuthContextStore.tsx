import { Party } from "@daml/types";
import React from "react";

export type AuthContext = {
  token: string,
  setPrimaryParty: (primaryParty: Party) => void,
  setReadOnly: (readOnly: boolean) => void,
  primaryParty: string,
  readOnly: boolean
}

const undefinedToken = '';
const undefinedPrimaryParty = '';

const defaultState = ({
  token: undefinedToken,
  setPrimaryParty: (_: Party) => {},
  setReadOnly: (_: boolean) => {},
  primaryParty: undefinedPrimaryParty,
  readOnly: false
});

const AuthContextStore: React.Context<AuthContext> = React.createContext(defaultState);

export default AuthContextStore;
