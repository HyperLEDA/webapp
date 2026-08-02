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

function searchSuggestion(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const coordinateHint = formatCoordinateInspectHint(
    inspectCoordinateQuery(trimmed),
  );
  if (coordinateHint) {
    return `Will search around coordinates: ${coordinateHint}`;
  }
  return `Will search name: ${trimmed}`;
}

export function SearchBar({
  initialValue = "",
  logoSize = "small",
  onSearch,
  className,
}: SearchBarProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState<string>(initialValue);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const onSearchHandler = onSearch ?? searchHandler(navigate);
  const suggestion = focused ? searchSuggestion(searchQuery) : null;

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
        <div className="flex items-start w-full">
          <div className="relative flex-grow min-w-0">
            <input
              type="text"
              placeholder="Search for an object..."
              className="border border-border rounded px-2 py-1 w-full h-10 bg-surface-2 text-primary placeholder:text-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
            {suggestion ? (
              <div className="absolute left-0 right-0 top-full z-10 mt-0.5 w-full text-left text-sm text-muted bg-surface-2 border border-border rounded px-2 py-2 shadow-sm pointer-events-none">
                {suggestion}
              </div>
            ) : null}
          </div>
          <Button onClick={handleSubmit} className="ml-2 h-10 shrink-0">
            Search
          </Button>
        </div>
      </div>
    </header>
  );
}
