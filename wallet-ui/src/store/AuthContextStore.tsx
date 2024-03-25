import React from "react";

export type AuthContext = {
  token: string,
  setPrimaryParty: (primaryParty: string) => void,
  primaryParty: string,
  readOnly: boolean
}

const undefinedToken = '';
const undefinedPrimaryParty = '';

const defaultState = ({
  token: undefinedToken,
  setPrimaryParty: (primaryParty: string) => {},
  primaryParty: undefinedPrimaryParty,
  readOnly: false
});

const AuthContextStore: React.Context<AuthContext> = React.createContext(defaultState);

export default AuthContextStore;

export function isDefinedPrimaryParty(party: string): boolean {
  return party !== undefinedPrimaryParty;
}
