import { FormEvent, ReactElement, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import type {
  TapSchemaEntry,
  TapSyncResponse,
} from "../../clients/backend/types.gen";
import { executeSqlQuery, syncPayloadToTable } from "../../lib/tap";
import { Button } from "../core/Button";
import { Text } from "../core/Text";
import { Loading } from "../core/Loading";
import { CommonTable } from "../ui/CommonTable";
import { SqlEditor } from "./SqlEditor";

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
  loggedIn: boolean;
  permalinkRunKey?: string | null;
  onQueryRun?: (sql: string) => void;
}

export function CatalogSqlPanel({
  sql,
  onSqlChange,
  schemas,
  loggedIn,
  permalinkRunKey,
  onQueryRun,
}: CatalogSqlPanelProps): ReactElement {
  const [result, setResult] = useState<TapSyncResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runShortcut = runQueryShortcutLabel();
  const location = useLocation();
  const didAutoRun = useRef(false);

  async function runQuery(): Promise<void> {
    if (!loggedIn || loading) {
      return;
    }
    const trimmed = sql.trim();
    if (!trimmed) {
      setError("Enter a SQL query to run.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    onQueryRun?.(trimmed);

    try {
      const payload = await executeSqlQuery(trimmed);
      setResult(payload);
    } catch (runError) {
      setError(`${runError}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    await runQuery();
  }

  useEffect(() => {
    didAutoRun.current = false;
  }, [location.key]);

  useEffect(() => {
    if (!permalinkRunKey || !loggedIn || didAutoRun.current) {
      return;
    }
    if (sql.trim() !== permalinkRunKey.trim()) {
      return;
    }
    didAutoRun.current = true;
    void runQuery();
  }, [permalinkRunKey, loggedIn, sql]);

  const tableData = result ? syncPayloadToTable(result) : null;
  const rowCount = tableData?.rows.length ?? 0;

  if (!loggedIn) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Text as="p" size="large">
          Log in to run SQL queries
        </Text>
        <Text as="p" className="mt-2">
          <RouterLink to="/login" className="text-accent hover:underline">
            Sign in
          </RouterLink>{" "}
          to execute queries via TAP /sync.
        </Text>
      </div>
    );
  }

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
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-left"
          >
            <Text as="p" style="header" size="small">
              Query failed
            </Text>
            <Text as="p" className="mt-1 text-danger">
              {error}
            </Text>
          </div>
        ) : null}
        {loading ? <Loading /> : null}
      </form>

      {tableData ? (
        <CommonTable columns={tableData.columns} data={tableData.rows}>
          <Text style="header" size="small">
            {rowCount === 1 ? "1 row" : `${rowCount} rows`}
          </Text>
        </CommonTable>
      ) : null}
    </div>
  );
}
