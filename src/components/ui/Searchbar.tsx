import { ReactElement, ReactNode, useState } from "react";
import { Link, NavigateFunction, useNavigate } from "react-router-dom";
import classNames from "classnames";
import { Button } from "../core/Button";
import { SuggestibleInput } from "../core/SuggestibleInput";
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

type SearchSuggestion = {
  primary: string;
  secondary?: string;
};

function searchSuggestion(query: string): SearchSuggestion | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const inspected = inspectCoordinateQuery(trimmed);
  const coordinateHint = formatCoordinateInspectHint(inspected);

  if (inspected.status === "valid" && coordinateHint) {
    return {
      primary: `Will search around coordinates: ${coordinateHint}`,
    };
  }

  if (inspected.status === "partial" && coordinateHint) {
    return {
      primary: `Will search name: ${trimmed}`,
      secondary: `If typed fully, will search around coordinates: ${coordinateHint}`,
    };
  }

  return { primary: `Will search name: ${trimmed}` };
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

  function handleSubmit() {
    if (searchQuery.trim()) {
      onSearchHandler(searchQuery);
    }
  }

  function getSuggestions(value: string): ReactNode[] {
    if (!focused) {
      return [];
    }
    const suggestion = searchSuggestion(value);
    if (!suggestion) {
      return [];
    }
    const nodes: ReactNode[] = [
      <div
        key="primary"
        className="px-2 py-2 text-left text-sm text-muted pointer-events-none"
      >
        {suggestion.primary}
      </div>,
    ];
    if (suggestion.secondary) {
      nodes.push(
        <div
          key="secondary"
          className="px-2 py-2 text-left text-sm text-muted pointer-events-none"
        >
          {suggestion.secondary}
        </div>,
      );
    }
    return nodes;
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
          <div className="flex-grow min-w-0">
            <SuggestibleInput
              value={searchQuery}
              onChange={setSearchQuery}
              getSuggestions={getSuggestions}
              placeholder="Search for an object..."
              className="h-10 px-2 py-1"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>
          <Button onClick={handleSubmit} className="ml-2 h-10 shrink-0">
            Search
          </Button>
        </div>
      </div>
    </header>
  );
}
