import React, { ReactElement, ReactNode, useEffect, useState } from "react";
import type { TapSyncResponse } from "../../clients/backend/types.gen";
import { executeSqlQuery, syncPayloadToTable } from "../../lib/tap";
import { Markdown } from "../ui/Markdown";
import { Text } from "../core/Text";
import { Loading } from "../core/Loading";
import { CellPrimitive, Column, CommonTable } from "../ui/CommonTable";

function renderMarkdownCell(value: CellPrimitive): ReactNode {
  if (value === undefined || value === null) {
    return <div />;
  }
  if (React.isValidElement(value)) {
    return value;
  }
  return <Markdown>{String(value)}</Markdown>;
}

function markdownColumns(columns: Column[]): Column[] {
  return columns.map((column) => ({
    ...column,
    renderCell: renderMarkdownCell,
  }));
}

export function SqlQueryEmbed({
  sql,
  onLoadingChange,
}: {
  sql: string;
  onLoadingChange?: (loading: boolean) => void;
}): ReactElement {
  const [result, setResult] = useState<TapSyncResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onLoadingChange?.(loading);
    return () => {
      onLoadingChange?.(false);
    };
  }, [loading, onLoadingChange]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const payload = await executeSqlQuery(sql);
        if (!cancelled) {
          setResult(payload);
        }
      } catch (runError) {
        if (!cancelled) {
          setError(`${runError}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sql]);

  const tableData = result ? syncPayloadToTable(result) : null;
  const rowCount = tableData?.rows.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {loading ? <Loading /> : null}
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
      {tableData ? (
        <CommonTable
          columns={markdownColumns(tableData.columns)}
          data={tableData.rows}
        >
          <Text style="header" size="small">
            {rowCount === 1 ? "1 row" : `${rowCount} rows`}
          </Text>
        </CommonTable>
      ) : null}
    </div>
  );
}
