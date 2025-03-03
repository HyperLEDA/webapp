import React, { useState } from "react";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { Button } from "./button";

interface SearchBarProps {
  initialValue?: string;
  onSearch: (query: string) => void;
  className?: string;
  logoSize?: "small" | "large";
  showLogo?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialValue = "",
  onSearch,
  className,
  logoSize = "large",
  showLogo = true
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialValue);
  
  const handleSubmit = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <header 
      className={classNames(
        "text-center mb-4 w-full max-w-4xl mx-auto", 
        { "md:flex md:items-center": logoSize === "small" }, 
        className
      )}
    >
      {showLogo && (
        <Link to="/">
          <img
            src="/src/assets/logo.png"
            alt="HyperLeda Logo"
            className={classNames({
              "h-32 mx-auto mb-2": logoSize === "large",
              "h-10": logoSize === "small"
            })}
          />
        </Link>
      )}
      <div 
        className={classNames(
          "flex items-center w-full",
          {
            "ml-2": logoSize === "small",
            "max-w-4xl mx-auto": logoSize === "large"
          }
        )}
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
};