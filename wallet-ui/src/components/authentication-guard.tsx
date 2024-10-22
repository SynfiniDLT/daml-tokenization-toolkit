// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { withAuthenticationRequired } from "@auth0/auth0-react";
import React from "react";
import { PageLoader } from "./layout/page-loader";

type Props = {
  component: React.ComponentType<any>;
}

export const AuthenticationGuard: React.FC<Props> = ({ component }) => {
  const Component = withAuthenticationRequired(component, {
    onRedirecting: () => (
      <div className="page-layout">
        <PageLoader />
      </div>
    ),
  });

  return <Component />;
};