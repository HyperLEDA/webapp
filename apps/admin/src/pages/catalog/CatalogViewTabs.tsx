import { ReactElement } from "react";
import { NavLink } from "react-router-dom";
import classNames from "classnames";

function catalogTabClassName({ isActive }: { isActive: boolean }): string {
  return classNames(
    "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
    isActive
      ? "border-accent text-primary"
      : "border-transparent text-muted hover:text-primary hover:border-border",
  );
}

export function CatalogViewTabs(): ReactElement {
  return (
    <nav className="flex gap-1 border-b border-border mb-4">
      <NavLink to="/data-catalog" end className={catalogTabClassName}>
        Browse tables
      </NavLink>
      <NavLink to="/data-catalog/query" className={catalogTabClassName}>
        SQL query
      </NavLink>
    </nav>
  );
}
