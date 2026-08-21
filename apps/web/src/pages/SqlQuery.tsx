import { ReactElement, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogSqlPanel } from "@leda/lib/ui";
import { DEFAULT_SQL_EXAMPLE, parseSqlPermalink } from "@leda/lib/tap";

export function SqlQueryPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const permalinkSql = searchParams.get("q");
  const [sqlDraft, setSqlDraft] = useState(DEFAULT_SQL_EXAMPLE);

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
    <div className="p-8">
      <CatalogSqlPanel
        sql={sqlDraft}
        onSqlChange={setSqlDraft}
        permalinkRunKey={permalinkSql ? parseSqlPermalink(permalinkSql) : null}
        onQueryRun={handleQueryRun}
      />
    </div>
  );
}
