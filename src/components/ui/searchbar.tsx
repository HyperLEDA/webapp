import { ReactElement, useState } from "react";
import { Link, NavigateFunction, useNavigate } from "react-router-dom";
import classNames from "classnames";
import { Button } from "./button";

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
        className={classNames("flex items-center w-full", {
          "ml-2": logoSize === "small",
          "max-w-4xl mx-auto": logoSize === "large",
        })}
      >
        <input
          type="text"
          placeholder="Search for an object..."
          className="border rounded px-2 py-1 flex-grow h-10"
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
    </header>
  );
}
