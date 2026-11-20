import { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { SuggestibleInput } from "@leda/lib/ui";
import { describeUnknownError } from "@leda/lib/tap";
import { getTableList } from "../clients/admin";
import { adminClient } from "../clients";
import type { FieldOption } from "./ui";

const TABLE_SEARCH_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

async function loadTableNameOptions(query: string): Promise<FieldOption[]> {
  const response = await getTableList({
    client: adminClient,
    query: {
      query: query.trim() || undefined,
      page: 0,
      page_size: TABLE_SEARCH_PAGE_SIZE,
    },
  });
  if (response.error) {
    throw new Error(describeUnknownError(response.error));
  }
  return response.data.data.tables.map((item) => ({
    value: item.name,
    label: item.name,
    description: item.description,
  }));
}

export function TableSearchInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}): ReactElement {
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [options, setOptions] = useState<FieldOption[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      requestIdRef.current += 1;
    },
    [],
  );

  function scheduleOptionsLoad(query: string): void {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      void (async () => {
        try {
          const loaded = await loadTableNameOptions(query);
          if (requestId !== requestIdRef.current) {
            return;
          }
          setOptionsError(null);
          setOptions(loaded);
        } catch (err) {
          if (requestId !== requestIdRef.current) {
            return;
          }
          setOptionsError(
            err instanceof Error ? err.message : "Failed to load options",
          );
          setOptions([]);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
  }

  function renderSuggestions(query: string): ReactNode[] {
    const needle = query.trim().toLowerCase();
    return options
      .filter((option) => {
        if (!needle) {
          return true;
        }
        return (
          option.label.toLowerCase().includes(needle) ||
          option.value.toLowerCase().includes(needle) ||
          (option.description ?? "").toLowerCase().includes(needle)
        );
      })
      .map((option) => (
        <button
          key={option.value}
          type="button"
          className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            onChange(option.value);
          }}
        >
          <div>{option.label}</div>
          {option.description ? (
            <div className="text-xs text-muted">{option.description}</div>
          ) : null}
        </button>
      ));
  }

  return (
    <div className="min-w-0">
      <SuggestibleInput
        value={value}
        onChange={(nextValue) => {
          onChange(nextValue);
          scheduleOptionsLoad(nextValue);
        }}
        getSuggestions={renderSuggestions}
        disabled={disabled}
        onFocus={() => {
          scheduleOptionsLoad(value);
        }}
      />
      {optionsError ? (
        <p className="mt-1 text-xs text-danger">{optionsError}</p>
      ) : null}
    </div>
  );
}
