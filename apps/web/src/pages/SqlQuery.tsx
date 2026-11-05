import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogSqlPanel } from "@leda/lib/ui";
import { parseSqlPermalink } from "@leda/lib/tap";
import { executeTapQuery } from "../lib/tapQuery";

const PUBLIC_SQL_EXAMPLE =
  "SELECT TOP 25 * FROM leda.designations WHERE pgc = 67872";

export function SqlQueryPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const permalinkSql = searchParams.get("q");
  const [sqlDraft, setSqlDraft] = useState(PUBLIC_SQL_EXAMPLE);

  useEffect(() => {
    document.title = "SQL | LEDA";
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
    <div>
      <CatalogSqlPanel
        sql={sqlDraft}
        onSqlChange={setSqlDraft}
        permalinkRunKey={permalinkSql ? parseSqlPermalink(permalinkSql) : null}
        onQueryRun={handleQueryRun}
        executeQuery={executeTapQuery}
      />
    </div>
  );
}
