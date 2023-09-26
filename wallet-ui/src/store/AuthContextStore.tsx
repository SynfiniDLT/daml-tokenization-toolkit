import React from "react";


const defaultState = ({
    token: '',
    setPrimaryParty: (primaryParty:string) => {},
    primaryParty: '',
    readOnly: false
  });
  
  const AuthContextStore = React.createContext(defaultState);
  
  export default AuthContextStore;