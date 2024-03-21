import React from "react";

export type AuthContext = {
  token: string,
  setPrimaryParty: (primaryParty: string) => void,
  primaryParty: string,
  readOnly: boolean
}

export const undefinedPrimaryParty = '';

const defaultState = ({
  token: '',
  setPrimaryParty: (primaryParty: string) => {},
  primaryParty: undefinedPrimaryParty,
  readOnly: false
});

const AuthContextStore: React.Context<AuthContext> = React.createContext(defaultState);

export default AuthContextStore;
