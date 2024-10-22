// Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PageFooterHyperlink } from "./page-footer-hyperlink";

export const PageFooter = () => {
  return (
    <footer className="page-footer">
      <div className="page-footer-grid">
        <div className="page-footer-grid__info">
          <div className="page-footer-info__message"></div>
        </div>
        <div className="page-footer-grid__brand">
          <div className="page-footer-brand">
            <PageFooterHyperlink path="#">
              Synfini Wallet
            </PageFooterHyperlink>
          </div>
        </div>
      </div>
    </footer>
  );
};
