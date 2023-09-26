import React from "react";
import { NavBarButtons } from "./nav-bar-buttons";
import { NavBarTabs } from "./nav-bar-tabs";

export const NavBar = () => {
  return (
    <div className="nav-bar__container">
      <nav className="nav-bar">
        <NavBarTabs />
        <NavBarButtons />
      </nav>
    </div>
  );
};
