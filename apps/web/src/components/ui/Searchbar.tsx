import { ReactElement, ReactNode, useState } from "react";
import { Link, NavigateFunction, useNavigate } from "react-router-dom";
import classNames from "classnames";
import { Button } from "@hyperleda/lib/ui";
import { SuggestibleInput } from "@hyperleda/lib/ui";
import { useTheme } from "../../hooks/useTheme";
import { inspectSearchTypes } from "../../lib/search/searchTypes";

interface SearchBarProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  className?: string;
  logoSize?: "small" | "large";
  autoFocus?: boolean;
}

function searchHandler(navigate: NavigateFunction) {
  return function f(query: string) {
    navigate(`/query?q=${encodeURIComponent(query)}`);
  };
}

function searchSuggestionLines(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const { eligible, partial } = inspectSearchTypes(trimmed);
  const lines = eligible.map((item) => item.suggestion);
  for (const item of partial) {
    lines.push(
      `If typed fully, will also search ${item.type.title}: ${item.hint}`,
    );
  }
  return lines;
}

export function SearchBar({
  initialValue = "",
  logoSize = "small",
  onSearch,
  className,
  autoFocus,
}: SearchBarProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState<string>(initialValue);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const onSearchHandler = onSearch ?? searchHandler(navigate);
  const logoSrc = effectiveTheme === "dark" ? "/logo-dark.png" : "/logo.png";

  function handleSubmit() {
    if (searchQuery.trim()) {
      onSearchHandler(searchQuery);
    }
  }

  function getSuggestions(value: string): ReactNode[] {
    if (!focused) {
      return [];
    }
    return searchSuggestionLines(value).map((line, index) => (
      <div
        key={`${index}-${line}`}
        className="px-2 py-2 text-left text-sm text-muted pointer-events-none"
      >
        {line}
      </div>
    ));
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
          src={logoSrc}
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
              autoFocus={autoFocus}
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
