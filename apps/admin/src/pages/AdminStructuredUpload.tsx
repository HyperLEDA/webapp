import { FormEvent, ReactElement, useEffect, useMemo, useState } from "react";
import {
  getCatalogs,
  startStructuredUpload,
  type CatalogField,
  type CatalogSchema,
  type StartStructuredUploadRequest,
} from "../clients/admin";
import { adminClient } from "../clients";
import { describeUnknownError, formatCaughtError } from "@leda/lib/tap";
import { sameEnvTasksOrigin } from "@leda/lib/origins";
import { Button } from "@leda/lib/ui";

const DEFAULT_BATCH_SIZE = 10_000;

function fieldRequired(field: CatalogField): boolean {
  return field.required !== false;
}

function fieldHint(field: CatalogField): string {
  const parts: string[] = [];
  if (field.description) {
    parts.push(field.description);
  }
  parts.push(`Type: ${field.data_type}`);
  if (field.unit) {
    parts.push(`Unit: ${field.unit}`);
  }
  return parts.join(" · ");
}

function buildUploadParams(
  schema: CatalogSchema,
  tableName: string,
  expressions: Map<string, string>,
  write: boolean,
  batchSize: number,
): StartStructuredUploadRequest["params"] {
  const params: StartStructuredUploadRequest["params"] = {
    table_name: tableName.trim(),
    write,
    batch_size: batchSize,
  };
  for (const field of schema.fields) {
    params[field.name] = expressions.get(field.name) ?? "";
  }
  return params;
}

export function AdminStructuredUploadPage(): ReactElement {
  const [catalogs, setCatalogs] = useState<CatalogSchema[]>([]);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [tableName, setTableName] = useState("");
  const [expressions, setExpressions] = useState(
    () => new Map<string, string>(),
  );
  const [write, setWrite] = useState(true);
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Structured upload | LEDA";
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalogs(): Promise<void> {
      setCatalogsLoading(true);
      setCatalogsError(null);
      try {
        const response = await getCatalogs({ client: adminClient });
        if (response.error) {
          throw new Error(describeUnknownError(response.error));
        }
        if (!response.data) {
          throw new Error("Unknown error");
        }
        if (!cancelled) {
          setCatalogs(response.data.data.catalogs);
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogsError(formatCaughtError(error));
        }
      } finally {
        if (!cancelled) {
          setCatalogsLoading(false);
        }
      }
    }

    void loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  const schema = useMemo(
    () => catalogs.find((item) => item.catalog === selectedCatalog) ?? null,
    [catalogs, selectedCatalog],
  );

  function handleCatalogChange(catalog: string): void {
    setSelectedCatalog(catalog);
    setSubmitError(null);
    const next = catalogs.find((item) => item.catalog === catalog);
    setExpressions(
      new Map((next?.fields ?? []).map((field) => [field.name, ""])),
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!schema) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await startStructuredUpload({
        client: adminClient,
        body: {
          catalog: schema.catalog,
          params: buildUploadParams(
            schema,
            tableName,
            expressions,
            write,
            batchSize,
          ),
          action_description: `structured upload ${schema.catalog} from ${tableName.trim()}`,
        },
      });
      if (response.error) {
        throw new Error(describeUnknownError(response.error));
      }
      const taskId = response.data.data.task_id;
      window.location.assign(`${sameEnvTasksOrigin()}/runs/flow-run/${taskId}`);
    } catch (error) {
      setSubmitError(formatCaughtError(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-bold mb-2">Structured upload</h2>
      <p className="text-sm text-muted mb-6">
        Start a Prefect upload task that evaluates expressions against a raw
        table and writes into a layer 1 catalog.
      </p>

      {catalogsLoading ? <p className="text-muted">Loading catalogs…</p> : null}
      {catalogsError ? (
        <p className="text-danger" role="alert">
          {catalogsError}
        </p>
      ) : null}

      {!catalogsLoading && !catalogsError ? (
        <div className="space-y-6">
          <div>
            <label htmlFor="catalog" className="block mb-1 text-subtle">
              Catalog
            </label>
            <select
              id="catalog"
              value={selectedCatalog}
              onChange={(event) => handleCatalogChange(event.target.value)}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
            >
              <option value="">Select a catalog…</option>
              {catalogs.map((item) => (
                <option key={item.catalog} value={item.catalog}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {schema ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted">{schema.description}</p>

              <div>
                <label htmlFor="table_name" className="block mb-1 text-subtle">
                  Table name
                </label>
                <input
                  id="table_name"
                  type="text"
                  required
                  value={tableName}
                  onChange={(event) => setTableName(event.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary placeholder:text-muted"
                  placeholder="rawdata table name"
                />
              </div>

              {schema.fields.map((field) => {
                const required = fieldRequired(field);
                const inputId = `field-${field.name}`;
                return (
                  <div key={field.name}>
                    <label htmlFor={inputId} className="block mb-1 text-subtle">
                      {field.name}
                      {required ? null : (
                        <span className="text-muted"> (optional)</span>
                      )}
                    </label>
                    <textarea
                      id={inputId}
                      required={required}
                      rows={2}
                      value={expressions.get(field.name) ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setExpressions((current) => {
                          const next = new Map(current);
                          next.set(field.name, value);
                          return next;
                        });
                      }}
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary placeholder:text-muted font-mono text-sm"
                      placeholder='e.g. col("ra") * deg'
                    />
                    <p className="text-xs text-muted mt-1">
                      {fieldHint(field)}
                    </p>
                  </div>
                );
              })}

              <div className="flex items-center gap-2">
                <input
                  id="write"
                  type="checkbox"
                  checked={write}
                  onChange={(event) => setWrite(event.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="write" className="text-subtle">
                  Write rows into the catalog
                </label>
              </div>

              <div>
                <label htmlFor="batch_size" className="block mb-1 text-subtle">
                  Batch size
                </label>
                <input
                  id="batch_size"
                  type="number"
                  min={1}
                  max={500_000}
                  required
                  value={batchSize}
                  onChange={(event) =>
                    setBatchSize(
                      Number(event.target.value) || DEFAULT_BATCH_SIZE,
                    )
                  }
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary"
                />
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? "Starting…" : "Start upload"}
              </Button>

              {submitError ? (
                <p className="text-danger" role="alert">
                  {submitError}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
