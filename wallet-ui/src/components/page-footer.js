import React from "react";
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
            <PageFooterHyperlink path="https://www2.asx.com.au/connectivity-and-data/dlt-as-a-service">
              ASX - DLT Solutions - Synfini
            </PageFooterHyperlink>
          </div>
        </div>
      </div>
    </footer>
  );
};
