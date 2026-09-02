import classNames from "classnames";
import { ReactElement, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  createReferenceRow,
  listReferenceRows,
  listReferences,
  patchReferenceRow,
} from "../clients/admin";
import type {
  ListReferenceRowsResponse,
  ReferenceFieldDescriptor,
  ReferenceResourceDescriptor,
  ReferenceRowItem,
} from "../clients/admin";
import { adminClient } from "../clients";
import {
  Button,
  CellPrimitive,
  Column,
  CommonTable,
  ErrorPage,
  Loading,
  Pagination,
} from "@leda/lib/ui";
import { DropdownFilter, TextFilter } from "../components/ui";
import { EditableReferenceField } from "../components/ui/EditableReferenceField";
import { ReferenceFieldInput } from "../components/ui/ReferenceFieldInput";
import {
  buildCreateRowPayload,
  referenceTableKey,
  fieldRequirementPlaceholder,
  type ReferenceValue,
} from "../components/ui/referenceValues";
import { useDataFetching } from "@leda/lib/hooks";
import { formatApiError, formatCaughtError } from "@leda/lib/tap";

const SEARCH_DEBOUNCE_MS = 300;

interface ReferenceContext {
  descriptor: ReferenceResourceDescriptor;
  rows: ListReferenceRowsResponse;
}

async function fetchReferenceContext(
  schema: string,
  table: string,
  query: string | null,
  page: number,
  pageSize: number,
): Promise<ReferenceContext> {
  const [referencesResponse, rowsResponse] = await Promise.all([
    listReferences({ client: adminClient }),
    listReferenceRows({
      client: adminClient,
      path: { schema, table },
      query: {
        query: query?.trim() || undefined,
        page,
        page_size: pageSize,
      },
    }),
  ]);

  if (referencesResponse.error) {
    throw new Error(formatApiError(referencesResponse.error));
  }
  if (rowsResponse.error) {
    throw new Error(formatApiError(rowsResponse.error));
  }
  if (!referencesResponse.data) {
    throw new Error("Unknown error");
  }

  const descriptor = referencesResponse.data.data.references.find(
    (reference) => reference.schema === schema && reference.table === table,
  );
  if (!descriptor) {
    throw new Error(`Unknown reference table ${schema}.${table}`);
  }

  return {
    descriptor,
    rows: rowsResponse.data.data,
  };
}

function mergeRowValues(item: ReferenceRowItem) {
  return { ...item.key, ...item.row };
}

interface ReferenceFiltersProps {
  query: string | null;
  pageSize: number;
  onQueryChange: (query: string) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function ReferenceFilters({
  query,
  pageSize,
  onQueryChange,
  onPageSizeChange,
}: ReferenceFiltersProps): ReactElement {
  const [localQuery, setLocalQuery] = useState<string>(query || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(query ?? "");
  }, [query]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  function handleQueryChange(value: string): void {
    setLocalQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onQueryChange(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <TextFilter
        title="Search"
        value={localQuery}
        onChange={handleQueryChange}
        placeholder="Search rows"
      />
      <DropdownFilter
        title="Page size"
        options={[
          { value: "10" },
          { value: "25" },
          { value: "50" },
          { value: "100" },
        ]}
        value={pageSize.toString()}
        onChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}
      />
    </div>
  );
}

interface SavingState {
  rowKey: string;
  fieldName: string;
}

export function ReferenceDetailsPage(): ReactElement {
  const { schema, table } = useParams<{ schema: string; table: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateRow, setShowCreateRow] = useState(false);
  const [createDrafts, setCreateDrafts] = useState<Record<string, string>>({});
  const [createTouched, setCreateTouched] = useState<Set<string>>(
    () => new Set(),
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [saving, setSaving] = useState<SavingState | null>(null);

  const query = searchParams.get("q");
  const page = Number.parseInt(searchParams.get("page") || "0", 10);
  const pageSize = Number.parseInt(searchParams.get("page_size") || "25", 10);

  useEffect(() => {
    document.title =
      schema && table
        ? `${schema}.${table} | References | LEDA`
        : "References | LEDA";
  }, [schema, table]);

  useEffect(() => {
    setShowCreateRow(false);
    setCreateDrafts({});
    setCreateTouched(new Set());
    setCreateError(null);
  }, [schema, table]);

  const { data, loading, error } = useDataFetching(
    () =>
      fetchReferenceContext(schema ?? "", table ?? "", query, page, pageSize),
    [schema, table, query, page, pageSize, refreshKey],
  );

  function cancelCreateRow(): void {
    setShowCreateRow(false);
    setCreateDrafts({});
    setCreateTouched(new Set());
    setCreateError(null);
  }

  function updateParams(updates: {
    q?: string;
    page?: number;
    page_size?: number;
  }): void {
    const nextParams = new URLSearchParams(searchParams);
    if (updates.q !== undefined) {
      if (updates.q.trim()) {
        nextParams.set("q", updates.q.trim());
      } else {
        nextParams.delete("q");
      }
      nextParams.set("page", "0");
    }
    if (updates.page !== undefined) {
      nextParams.set("page", updates.page.toString());
    }
    if (updates.page_size !== undefined) {
      nextParams.set("page_size", updates.page_size.toString());
      nextParams.set("page", "0");
    }
    setSearchParams(nextParams);
  }

  async function commitFieldChange(
    item: ReferenceRowItem,
    field: ReferenceFieldDescriptor,
    nextValue: ReferenceValue,
  ): Promise<void> {
    if (!schema || !table) {
      return;
    }

    setPatchError(null);
    setSaving({
      rowKey: JSON.stringify(item.key),
      fieldName: field.name,
    });

    try {
      const response = await patchReferenceRow({
        client: adminClient,
        path: { schema, table },
        body: {
          key: item.key,
          changes: { [field.name]: nextValue },
        },
      });
      if (response.error) {
        throw new Error(formatApiError(response.error));
      }
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setPatchError(formatCaughtError(err));
      throw err;
    } finally {
      setSaving(null);
    }
  }

  async function submitCreateRow(
    fields: ReferenceFieldDescriptor[],
  ): Promise<void> {
    if (!schema || !table) {
      return;
    }

    setCreateError(null);
    setCreateSaving(true);

    try {
      const row = buildCreateRowPayload(fields, createDrafts, createTouched);
      const response = await createReferenceRow({
        client: adminClient,
        path: { schema, table },
        body: { row },
      });
      if (response.error) {
        throw new Error(formatApiError(response.error));
      }
      setShowCreateRow(false);
      setCreateDrafts({});
      setCreateTouched(new Set());
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setCreateError(formatCaughtError(err));
    } finally {
      setCreateSaving(false);
    }
  }

  function renderFieldCell(
    item: ReferenceRowItem,
    field: ReferenceFieldDescriptor,
  ): ReactElement {
    const merged = mergeRowValues(item);
    const rowKey = JSON.stringify(item.key);
    const isSaving =
      saving?.rowKey === rowKey && saving.fieldName === field.name;

    return (
      <EditableReferenceField
        field={field}
        value={merged[field.name]}
        schema={schema ?? ""}
        table={table ?? ""}
        saving={isSaving}
        onCommit={(nextValue) => commitFieldChange(item, field, nextValue)}
      />
    );
  }

  function renderCreateFieldCell(
    field: ReferenceFieldDescriptor,
  ): ReactElement {
    return (
      <ReferenceFieldInput
        field={field}
        value={createDrafts[field.name] ?? ""}
        requirementLabel={fieldRequirementPlaceholder(field)}
        onChange={(nextValue) => {
          setCreateDrafts((prev) => ({ ...prev, [field.name]: nextValue }));
          setCreateTouched((prev) => new Set(prev).add(field.name));
        }}
        schema={schema ?? ""}
        table={table ?? ""}
        disabled={createSaving}
      />
    );
  }

  if (!schema || !table) {
    return <ErrorPage message="No reference table selected" />;
  }

  if (loading && !data) {
    return <Loading />;
  }

  if (error && !data) {
    return <ErrorPage title="Error" message={error} />;
  }

  if (!data) {
    return <ErrorPage message="Unknown error" />;
  }

  const fields = data.descriptor.fields;
  const columns: Column[] = fields.map((field) => ({
    slug: field.name,
    label: field.description ? `${field.name}` : field.name,
    hint: field.description ? <span>{field.description}</span> : undefined,
  }));

  const tableRows: Record<string, CellPrimitive>[] = [];

  if (showCreateRow) {
    const createRow: Record<string, CellPrimitive> = {};
    for (const field of fields) {
      createRow[field.name] = renderCreateFieldCell(field);
    }
    tableRows.push(createRow);
  }

  for (const item of data.rows.items) {
    const row: Record<string, CellPrimitive> = {};
    for (const field of fields) {
      row[field.name] = renderFieldCell(item, field);
    }
    tableRows.push(row);
  }

  const selectedKey = referenceTableKey(schema, table);

  return (
    <div className="min-w-0 w-full max-w-full overflow-x-hidden">
      <div className="mb-4">
        <h2 className="text-3xl font-bold">
          {data.descriptor.description || selectedKey}
        </h2>
        <p className="text-muted font-mono text-sm mt-1">{selectedKey}</p>
      </div>

      <ReferenceFilters
        query={query}
        pageSize={pageSize}
        onQueryChange={(nextQuery) => updateParams({ q: nextQuery })}
        onPageSizeChange={(nextPageSize) =>
          updateParams({ page_size: nextPageSize })
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {showCreateRow ? (
          <>
            <Button
              type="button"
              disabled={createSaving}
              onClick={() => void submitCreateRow(fields)}
            >
              Submit
            </Button>
            <Button
              type="button"
              transparent
              disabled={createSaving}
              onClick={cancelCreateRow}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button type="button" onClick={() => setShowCreateRow(true)}>
            Add row
          </Button>
        )}
      </div>

      {createError ? (
        <p className="mb-4 text-sm text-danger">{createError}</p>
      ) : null}
      {patchError ? (
        <p className="mb-4 text-sm text-danger">{patchError}</p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <CommonTable
        columns={columns}
        data={tableRows}
        loading={loading}
        cellClassName="break-words"
        className={classNames(
          showCreateRow && "[&_tbody_tr:first-child]:bg-surface-2",
        )}
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        records={data.rows.items}
        total={data.rows.total}
        handlePageChange={(nextPage) => updateParams({ page: nextPage })}
      />
    </div>
  );
}
