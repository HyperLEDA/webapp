import { FormEvent, ReactElement, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { TapSchemaEntry } from "../../clients/backend/types.gen";
import { Button } from "../core/Button";
import { Text } from "../core/Text";
import { SqlEditor } from "./SqlEditor";
import { SqlQueryEmbed } from "./SqlQueryEmbed";

function runQueryShortcutLabel(): string {
  if (typeof navigator === "undefined") {
    return "Ctrl+Enter";
  }
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘↵" : "Ctrl+Enter";
}

interface CatalogSqlPanelProps {
  sql: string;
  onSqlChange: (sql: string) => void;
  schemas?: TapSchemaEntry[];
  permalinkRunKey?: string | null;
  onQueryRun?: (sql: string) => void;
}

export function CatalogSqlPanel({
  sql,
  onSqlChange,
  schemas,
  permalinkRunKey,
  onQueryRun,
}: CatalogSqlPanelProps): ReactElement {
  const [executedSql, setExecutedSql] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const runShortcut = runQueryShortcutLabel();
  const location = useLocation();
  const didAutoRun = useRef(false);

  function triggerRun(trimmed: string): void {
    setValidationError(null);
    setExecutedSql(trimmed);
    setRunId((id) => id + 1);
    setLoading(true);
    onQueryRun?.(trimmed);
  }

  function runQuery(): void {
    if (loading) {
      return;
    }
    const trimmed = sql.trim();
    if (!trimmed) {
      setValidationError("Enter a SQL query to run.");
      setExecutedSql(null);
      setLoading(false);
      return;
    }
    triggerRun(trimmed);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    runQuery();
  }

  useEffect(() => {
    didAutoRun.current = false;
  }, [location.key]);

  useEffect(() => {
    if (!permalinkRunKey || didAutoRun.current) {
      return;
    }
    if (sql.trim() !== permalinkRunKey.trim()) {
      return;
    }
    didAutoRun.current = true;
    triggerRun(sql.trim());
  }, [permalinkRunKey, sql]);

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <SqlEditor
          value={sql}
          onChange={onSqlChange}
          schemas={schemas}
          disabled={loading}
          onRunQuery={runQuery}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Running…" : `Run query (${runShortcut})`}
          </Button>
        </div>
        {validationError ? (
          <div
            role="alert"
            className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-left"
          >
            <Text as="p" style="header" size="small">
              Query failed
            </Text>
            <Text as="p" className="mt-1 text-danger">
              {validationError}
            </Text>
          </div>
        ) : null}
      </form>

      {executedSql ? (
        <SqlQueryEmbed
          key={runId}
          sql={executedSql}
          onLoadingChange={setLoading}
        />
      ) : null}
    </div>
  );
}
