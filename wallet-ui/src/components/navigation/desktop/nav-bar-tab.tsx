import React from "react";
import { NavLink } from "react-router-dom";

export const NavBarTab: React.FC<{path: string, label: string}> = ({ path, label }) => {
  return (
    <NavLink
      to={path}
      end
      className={({ isActive }) =>
        "nav-bar__tab " + (isActive ? "nav-bar__tab--active" : "")
      }
    >
      {label}
    </NavLink>
  );
};
