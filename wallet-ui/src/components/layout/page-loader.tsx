// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from "react";

export  const PageLoader: React.FC = () => {
  const loadingImg = "https://cdn.auth0.com/blog/hello-auth0/loader.svg";

  return (
    <div className="loader">
      <img src={loadingImg} alt="Loading..." />
    </div>
  );
};
