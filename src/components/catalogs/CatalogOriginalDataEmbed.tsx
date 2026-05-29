import { ReactElement, useEffect, useState } from "react";
import { MdCode } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import type { TapSyncResponse } from "../../clients/backend/types.gen";
import { executeSqlQuery, syncPayloadToTable } from "../../lib/tap";
import { Button } from "../core/Button";
import { Text } from "../core/Text";
import { Loading } from "../core/Loading";
import { AppTooltip } from "../ui/AppTooltip";
import { CommonTable } from "../ui/CommonTable";
import { originalDataCatalogLink } from "./catalogActions";

export function CatalogOriginalDataEmbed({
  sql,
}: {
  sql: string;
}): ReactElement {
  const navigate = useNavigate();
  const [result, setResult] = useState<TapSyncResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
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
        <CommonTable columns={tableData.columns} data={tableData.rows}>
          <Text style="header" size="small">
            {rowCount === 1 ? "1 row" : `${rowCount} rows`}
          </Text>
        </CommonTable>
      ) : null}
      <div className="flex justify-end">
        <AppTooltip content="Open in data catalog">
          <Button
            type="button"
            className="!p-1.5 cursor-pointer"
            onClick={() => navigate(originalDataCatalogLink(sql))}
            aria-label="Open in data catalog"
          >
            <MdCode className="size-5 text-muted" aria-hidden />
          </Button>
        </AppTooltip>
      </div>
    </div>
  );
}
