import React from "react";

export const PageFooterHyperlink: React.FC<{children: string, path: string}> = ({ children, path }) => {
  return (
    <a
      className="page-footer__hyperlink"
      href={path}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
};
