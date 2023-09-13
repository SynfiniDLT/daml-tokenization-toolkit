import React, { useCallback } from "react";

type Props = {
  onLogin: (token: string) => void;
};

const LoginScreen: React.FC<Props> = ({ onLogin }) => {
  // Call this login function once the token is received
  const login = useCallback(
    async (token: string) => {
      onLogin(token);
    },
    [onLogin],
  );

  // TODO
  return (
    <>
    </>
  );
};

export default LoginScreen;
