// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useAuth0 } from "@auth0/auth0-react";
import { LoginButton } from "../../buttons/login-button";
import { LogoutButton } from "../../buttons/logout-button";
import HoverPopUp from "../../layout/hoverPopUp";
import { useWalletUser } from "../../../App";
import { walletMode } from "../../../Configuration";
import { truncateParty } from "../../../Util";

export const NavBarButtons = () => {
  const { isAuthenticated, user } = useAuth0();
  const { primaryParty, readOnly } = useWalletUser();

  return (
    <div className="nav-bar__buttons">
      {!isAuthenticated && (
        <>
          <LoginButton />
        </>
      )}
      {isAuthenticated && (
        <>
          <div style={{ position: "relative", right: "20%", bottom: "15%" }}>
            {user !== undefined && user.email} <br />
            <HoverPopUp popUpContent={primaryParty} triggerText={primaryParty === undefined ? "" : truncateParty(primaryParty)}></HoverPopUp>
            <br />
            {walletMode[0].toUpperCase() + walletMode.substring(1)} Wallet 
            <br/>
            {readOnly && ("Observer mode")}
          </div>
          <div>
            <LogoutButton />
          </div>
        </>
      )}
    </div>
  );
};
