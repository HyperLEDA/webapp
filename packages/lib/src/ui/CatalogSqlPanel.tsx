import {
  FormEvent,
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  TapSchemaEntry,
  TapSyncResponse,
} from "@leda/lib/clients/backend";
import { Button } from "./Button";
import { SqlEditor } from "./SqlEditor";
import { SqlQueryEmbed } from "./SqlQueryEmbed";
import { Text } from "./Text";

function runQueryShortcutLabel(): string {
  if (!("navigator" in globalThis)) {
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
  executeQuery?: (sql: string) => Promise<TapSyncResponse>;
}

export function CatalogSqlPanel({
  sql,
  onSqlChange,
  schemas,
  permalinkRunKey,
  onQueryRun,
  executeQuery,
}: CatalogSqlPanelProps): ReactElement {
  const [executedSql, setExecutedSql] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const runShortcut = runQueryShortcutLabel();
  const lastAutoRunKey = useRef<string | null>(null);

  const triggerRun = useCallback(
    (trimmed: string): void => {
      lastAutoRunKey.current = trimmed;
      setValidationError(null);
      setExecutedSql(trimmed);
      setRunId((id) => id + 1);
      setLoading(true);
      if (permalinkRunKey?.trim() !== trimmed) {
        onQueryRun?.(trimmed);
      }
    },
    [onQueryRun, permalinkRunKey],
  );

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
    if (!permalinkRunKey) {
      return;
    }
    const trimmedPermalink = permalinkRunKey.trim();
    if (sql.trim() !== trimmedPermalink) {
      return;
    }
    if (lastAutoRunKey.current === trimmedPermalink) {
      return;
    }
    triggerRun(trimmedPermalink);
  }, [permalinkRunKey, sql, triggerRun]);

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
          executeQuery={executeQuery}
        />
      ) : null}
    </div>
  );
}
