import { ReactElement, useState } from "react";
import { Link, NavigateFunction, useNavigate } from "react-router-dom";
import classNames from "classnames";
import { Button } from "../core/Button";
import {
  formatCoordinateInspectHint,
  inspectCoordinateQuery,
} from "../../lib/astronomy/parseCoordinateQuery";

interface SearchBarProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  className?: string;
  logoSize?: "small" | "large";
}

function searchHandler(navigate: NavigateFunction) {
  return function f(query: string) {
    navigate(`/query?q=${encodeURIComponent(query)}`);
  };
}

export function SearchBar({
  initialValue = "",
  logoSize = "small",
  onSearch,
  className,
}: SearchBarProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState<string>(initialValue);
  const navigate = useNavigate();
  const onSearchHandler = onSearch ?? searchHandler(navigate);
  const coordinateHint = formatCoordinateInspectHint(
    inspectCoordinateQuery(searchQuery),
  );

  function handleSubmit() {
    if (searchQuery.trim()) {
      onSearchHandler(searchQuery);
    }
  }

  return (
    <header
      className={classNames(
        "text-center mb-4 w-full max-w-4xl mx-auto",
        { "md:flex md:items-center": logoSize === "small" },
        className,
      )}
    >
      <Link to="/">
        <img
          src="/logo.png"
          alt="HyperLeda Logo"
          className={classNames({
            "h-32 mx-auto mb-2": logoSize === "large",
            "h-10": logoSize === "small",
          })}
        />
      </Link>
      <div
        className={classNames("w-full", {
          "ml-2": logoSize === "small",
          "max-w-4xl mx-auto": logoSize === "large",
        })}
      >
        <div className="flex items-center w-full">
          <input
            type="text"
            placeholder="Search for an object..."
            className="border border-border rounded px-2 py-1 flex-grow h-10 bg-surface-2 text-primary placeholder:text-muted"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />
          <Button onClick={handleSubmit} className="ml-2 h-10">
            Search
          </Button>
        </div>
        {coordinateHint ? (
          <div className="mt-1 text-left text-sm text-muted px-1">
            {coordinateHint}
          </div>
        ) : null}
      </div>
    </header>
  );
}
