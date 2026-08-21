import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { TapSyncResponse } from "@hyperleda/lib/clients/backend";
import { tapSync } from "../clients/admin";
import { adminClient } from "../clients";
import {
  DEFAULT_SQL_EXAMPLE,
  formatApiError,
  parseSqlPermalink,
} from "@hyperleda/lib/tap";
import { CatalogSqlPanel } from "@hyperleda/lib/ui";

async function executeAdminSqlQuery(sql: string): Promise<TapSyncResponse> {
  const response = await tapSync({
    client: adminClient,
    query: { query: sql },
  });
  if (response.error) {
    throw new Error(formatApiError(response.error));
  }
  return response.data.data;
}

export function SqlQueryPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const permalinkSql = searchParams.get("q");
  const [sqlDraft, setSqlDraft] = useState(DEFAULT_SQL_EXAMPLE);

  useEffect(() => {
    document.title = "SQL | HyperLEDA";
  }, []);

  useLayoutEffect(() => {
    if (!permalinkSql) {
      return;
    }
    setSqlDraft(parseSqlPermalink(permalinkSql));
  }, [permalinkSql]);

  function handleQueryRun(sql: string): void {
    setSearchParams({ q: sql }, { replace: true });
  }

  return (
    <div className="p-8">
      <CatalogSqlPanel
        sql={sqlDraft}
        onSqlChange={setSqlDraft}
        permalinkRunKey={permalinkSql ? parseSqlPermalink(permalinkSql) : null}
        onQueryRun={handleQueryRun}
        executeQuery={executeAdminSqlQuery}
      />
    </div>
  );
}
