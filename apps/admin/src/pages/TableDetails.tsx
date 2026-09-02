import classNames from "classnames";
import { ReactElement, useEffect, useMemo, useState } from "react";
import {
  Bibliography,
  DataType,
  GetTableResponse,
  TableProgress,
  TableStatus,
  getTable,
  patchTable,
} from "../clients/admin";
import { useNavigate, useParams } from "react-router-dom";
import { adminClient } from "../clients";
import { isLoggedIn } from "../auth";
import {
  Card,
  CardAction,
  CellPrimitive,
  Column,
  CommonTable,
  ErrorPage,
  Field,
  Hint,
  Link,
  Loading,
} from "@leda/lib/ui";
import { Badge, CopyButton, EditableField, TextFilter } from "../components/ui";
import { useDataFetching } from "@leda/lib/hooks";
import { originalDataCatalogLink } from "@leda/lib/astronomy";
import { formatCaughtError } from "@leda/lib/tap";

const DATA_TYPES: DataType[] = [
  "regular",
  "reprocessing",
  "preliminary",
  "compilation",
];

const TABLE_STATUSES: TableStatus[] = ["initiated", "archived"];

function asDataType(value: string): DataType {
  if (
    value === "regular" ||
    value === "reprocessing" ||
    value === "preliminary" ||
    value === "compilation"
  ) {
    return value;
  }
  return "regular";
}

function asTableStatus(value: string): TableStatus {
  if (value === "initiated" || value === "archived") {
    return value;
  }
  return "initiated";
}

function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function selectAllColumnsFromRawdataTable(
  tableName: string,
  columns: GetTableResponse["column_info"],
  limit = 25,
): string {
  const qualifiedTable = `rawdata.${quoteSqlIdentifier(tableName)}`;
  if (columns.length === 0) {
    return `SELECT * FROM ${qualifiedTable} LIMIT ${limit}`;
  }

  const columnList = columns
    .map((column) => quoteSqlIdentifier(column.name))
    .join(", ");
  return `SELECT ${columnList} FROM ${qualifiedTable} LIMIT ${limit}`;
}

function renderBibliography(bib: Bibliography): ReactElement {
  const targetLink = `https://ui.adsabs.harvard.edu/abs/${bib.bibcode}/abstract`;

  return (
    <div className="flex items-center gap-2">
      <Link href={targetLink} external>
        {bib.bibcode}
      </Link>
      <Hint
        hintContent={
          <span>
            "{bib.title}". {bib.authors.join(", ")}. {bib.year}
          </span>
        }
        className="gap-1"
      />
    </div>
  );
}

function renderTime(time: string): string {
  const dt = new Date(time);

  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function isCellString(value: CellPrimitive): value is string {
  return Object(value) !== value && !Number.isFinite(value);
}

function renderUCD(ucd: CellPrimitive): ReactElement {
  if (!isCellString(ucd)) {
    return <div></div>;
  }

  const words: ReactElement[] = [];

  ucd.split(";").forEach((word, index) => {
    words.push(<Badge key={`${word}-${index}`}>{word}</Badge>);
  });

  return (
    <CopyButton textToCopy={ucd}>
      <div>{words}</div>
    </CopyButton>
  );
}

function renderColumnName(name: CellPrimitive): ReactElement {
  return (
    <CopyButton textToCopy={String(name)}>
      <p>{name}</p>
    </CopyButton>
  );
}

type ColumnMetadataField = "description" | "unit" | "ucd";

function renderMetadataDisplay(
  value: string | null | undefined,
  renderDisplay?: (value: string) => ReactElement,
): ReactElement {
  if (value && renderDisplay) {
    return renderDisplay(value);
  }

  return (
    <span className={classNames(!value && "text-muted")}>{value || "—"}</span>
  );
}

interface TableMetaProps {
  tableName: string;
  table: GetTableResponse;
  className?: string;
}

function TableMeta(props: TableMetaProps): ReactElement {
  const navigate = useNavigate();
  const canEdit = isLoggedIn();
  const [savingField, setSavingField] = useState<
    "name" | "description" | "datatype" | "status" | null
  >(null);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [datatype, setDatatype] = useState(() =>
    asDataType(String(props.table.meta.datatype)),
  );
  const [status, setStatus] = useState(() =>
    asTableStatus(String(props.table.meta.status)),
  );

  useEffect(() => {
    setDatatype(asDataType(String(props.table.meta.datatype)));
    setStatus(asTableStatus(String(props.table.meta.status)));
  }, [props.table.meta.datatype, props.table.meta.status]);

  async function runTablePatch(
    field: "name" | "description" | "datatype" | "status",
    body: {
      table_name: string;
      new_table_name?: string;
      description?: string;
      datatype?: DataType;
      status?: TableStatus;
    },
    onSuccess?: () => void,
  ): Promise<void> {
    setPatchError(null);
    setSavingField(field);
    try {
      const response = await patchTable({
        client: adminClient,
        body,
      });
      if (response.error) {
        throw new Error(JSON.stringify(response.error));
      }
      onSuccess?.();
    } catch (err) {
      setPatchError(formatCaughtError(err));
      throw err;
    } finally {
      setSavingField(null);
    }
  }

  async function commitSlug(trimmed: string): Promise<void> {
    if (!trimmed) {
      return;
    }
    await runTablePatch(
      "name",
      {
        table_name: props.tableName,
        new_table_name: trimmed,
      },
      () => {
        void navigate(`/table/${encodeURIComponent(trimmed)}`);
      },
    );
  }

  async function commitDescription(trimmed: string): Promise<void> {
    await runTablePatch("description", {
      table_name: props.tableName,
      description: trimmed,
    });
  }

  async function commitDatatype(next: DataType): Promise<void> {
    if (next === datatype) {
      return;
    }
    await runTablePatch(
      "datatype",
      {
        table_name: props.tableName,
        datatype: next,
      },
      () => setDatatype(next),
    );
  }

  async function commitStatus(next: TableStatus): Promise<void> {
    if (next === status) {
      return;
    }
    await runTablePatch(
      "status",
      {
        table_name: props.tableName,
        status: next,
      },
      () => setStatus(next),
    );
  }

  const datatypeControl = canEdit ? (
    <select
      value={datatype}
      onChange={(event) => void commitDatatype(asDataType(event.target.value))}
      disabled={savingField !== null}
      className="bg-surface-2 border border-border rounded px-2 py-1 text-primary max-w-xs"
    >
      {DATA_TYPES.map((option) => (
        <option key={option} value={option} className="bg-surface-2">
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </option>
      ))}
    </select>
  ) : (
    datatype.charAt(0).toUpperCase() + datatype.slice(1)
  );

  const statusControl = canEdit ? (
    <select
      value={status}
      onChange={(event) => void commitStatus(asTableStatus(event.target.value))}
      disabled={savingField !== null}
      className="bg-surface-2 border border-border rounded px-2 py-1 text-primary max-w-xs"
    >
      {TABLE_STATUSES.map((option) => (
        <option key={option} value={option} className="bg-surface-2">
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </option>
      ))}
    </select>
  ) : (
    status.charAt(0).toUpperCase() + status.slice(1)
  );

  return (
    <Card title="Overview" variant="fields" className={props.className}>
      <Field label="Table name">
        {canEdit ? (
          <EditableField
            value={props.table.description}
            editLabel="Edit table name"
            saving={savingField === "description"}
            onSave={commitDescription}
          />
        ) : (
          <span className="min-w-0">{props.table.description}</span>
        )}
      </Field>
      <Field label="Slug">
        {canEdit ? (
          <EditableField
            value={props.tableName}
            editLabel="Edit table slug"
            saving={savingField === "name"}
            inputClassName="font-mono"
            displayClassName="font-mono min-w-0 break-all"
            onSave={commitSlug}
          />
        ) : (
          <span className="font-mono min-w-0 break-all">{props.tableName}</span>
        )}
      </Field>
      <Field label="Table ID">{props.table.id}</Field>
      <Field label="Source paper">
        {renderBibliography(props.table.bibliography)}
      </Field>
      <Field label="Type of data">{datatypeControl}</Field>
      <Field label="Status">{statusControl}</Field>
      <Field label="Modification time">
        {renderTime(String(props.table.meta.modification_dt))}
      </Field>
      {patchError ? (
        <>
          <dt className="sr-only">Error</dt>
          <dd className="col-span-2 text-sm text-danger">{patchError}</dd>
        </>
      ) : null}
    </Card>
  );
}

function formatPercent(marked: number, total: number): string {
  if (total <= 0) {
    return "";
  }
  return `${Math.floor((marked / total) * 100)}%`;
}

function formatProgressValue(count: number, total: number): ReactElement {
  const percent = formatPercent(count, total);
  if (!percent) {
    return <>{count}</>;
  }

  return (
    <>
      {count} <span className="text-muted">({percent})</span>
    </>
  );
}

function catalogProgressTabClassName(isActive: boolean): string {
  return classNames(
    "w-full text-left px-2 py-1 text-xs font-medium border-l-2 transition-colors truncate",
    isActive
      ? "border-accent text-primary"
      : "border-transparent text-muted hover:text-primary hover:border-border",
  );
}

function hasCrossmatchWork(progress: TableProgress): boolean {
  return (
    progress.unprocessed > 0 ||
    progress.pending_triage > 0 ||
    progress.resolved_unsubmitted > 0
  );
}

function TableProgressSummaryCard({
  progress,
  tableName,
  className,
}: {
  progress: TableProgress;
  tableName: string;
  className?: string;
}): ReactElement {
  const actions: CardAction[] = hasCrossmatchWork(progress)
    ? [
        {
          title: "View crossmatch results",
          href: `/crossmatch?table_name=${encodeURIComponent(tableName)}&triage_status=pending`,
        },
      ]
    : [];

  return (
    <Card
      title="Progress"
      variant="fields"
      className={className}
      actions={actions}
    >
      <Field label="Total records">{progress.total_records}</Field>
      <Field label="Waiting for cross-identification">
        {formatProgressValue(progress.unprocessed, progress.total_records)}
      </Field>
      <Field label="Waiting for manual check">
        {formatProgressValue(progress.pending_triage, progress.total_records)}
      </Field>
      <Field label="Waiting for submission">
        {formatProgressValue(
          progress.resolved_unsubmitted,
          progress.total_records,
        )}
      </Field>
      <Field label="Submitted">
        {formatProgressValue(progress.submitted, progress.total_records)}
      </Field>
    </Card>
  );
}

function CatalogProgressCard({
  catalogs,
  totalRecords,
  className,
}: {
  catalogs: TableProgress["catalogs"];
  totalRecords: number;
  className?: string;
}): ReactElement {
  const catalogEntries = Object.entries(catalogs);
  const [selectedCatalog, setSelectedCatalog] = useState(
    catalogEntries[0]?.[0] ?? "",
  );

  useEffect(() => {
    if (
      catalogEntries.length > 0 &&
      !catalogEntries.some(([name]) => name === selectedCatalog)
    ) {
      setSelectedCatalog(catalogEntries[0][0]);
    }
  }, [catalogEntries, selectedCatalog]);

  const selectedProgress = catalogs[selectedCatalog];

  return (
    <Card title="Catalog progress" variant="block" className={className}>
      <div className="flex items-start gap-3">
        <nav
          className="flex flex-col gap-0.5 shrink-0 w-max border-r border-border pr-2"
          role="tablist"
        >
          {catalogEntries.map(([catalogName, catalogProgress]) => {
            const markedPercent = formatPercent(
              catalogProgress.structured,
              totalRecords,
            );

            return (
              <button
                key={catalogName}
                type="button"
                role="tab"
                aria-selected={catalogName === selectedCatalog}
                className={catalogProgressTabClassName(
                  catalogName === selectedCatalog,
                )}
                onClick={() => setSelectedCatalog(catalogName)}
              >
                {catalogName}
                {markedPercent ? (
                  <span className="text-muted"> ({markedPercent})</span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-base min-w-0 flex-1 content-start">
          <Field label="Marked">
            {formatProgressValue(selectedProgress.structured, totalRecords)}
          </Field>
          <Field label="Aggregated">
            {formatProgressValue(selectedProgress.in_layer2, totalRecords)}
          </Field>
          <Field label="Waiting for aggregation">
            {formatProgressValue(selectedProgress.layer2_pending, totalRecords)}
          </Field>
        </dl>
      </div>
    </Card>
  );
}

interface ColumnInfoProps {
  tableName: string;
  table: GetTableResponse;
}

const COLUMN_SELECT_KEY = "";

function columnMatchesSearch(
  col: GetTableResponse["column_info"][number],
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const fields = [col.name, col.description, col.ucd];
  return fields.some(
    (value) =>
      value !== null &&
      value !== undefined &&
      value.toLowerCase().includes(needle),
  );
}

function ColumnInfo(props: ColumnInfoProps): ReactElement {
  const navigate = useNavigate();
  const canEdit = isLoggedIn();
  const [query, setQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    () => new Set(),
  );
  const [saving, setSaving] = useState<{
    columnName: string;
    field: ColumnMetadataField;
  } | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedColumns(new Set());
  }, [props.tableName]);

  useEffect(() => {
    setSelectedColumns((prev) => {
      const names = new Set(props.table.column_info.map((col) => col.name));
      return new Set([...prev].filter((name) => names.has(name)));
    });
  }, [props.table.column_info]);

  function toggleColumn(name: string): void {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function commitColumnMetadata(
    columnName: string,
    field: ColumnMetadataField,
    trimmed: string,
  ): Promise<void> {
    setPatchError(null);
    setSaving({ columnName, field });
    try {
      const response = await patchTable({
        client: adminClient,
        body: {
          table_name: props.tableName,
          columns: {
            [columnName]: {
              [field]: trimmed === "" ? null : trimmed,
            },
          },
        },
      });
      if (response.error) {
        throw new Error(JSON.stringify(response.error));
      }
    } catch (err) {
      setPatchError(formatCaughtError(err));
      throw err;
    } finally {
      setSaving(null);
    }
  }

  function renderMetadataCell(
    columnName: string,
    field: ColumnMetadataField,
    value: string | null | undefined,
    renderDisplay?: (displayValue: string) => ReactElement,
  ): ReactElement {
    if (!canEdit) {
      return renderMetadataDisplay(value, renderDisplay);
    }

    const isSaving =
      saving?.columnName === columnName && saving.field === field;

    return (
      <EditableField
        value={value ?? ""}
        editLabel={`Edit ${field} for column ${columnName}`}
        saving={isSaving}
        align="start"
        emptyDisplayValue="—"
        renderDisplay={renderDisplay}
        onSave={(trimmed) => commitColumnMetadata(columnName, field, trimmed)}
      />
    );
  }

  const selectedColumnInfo = useMemo(
    () =>
      props.table.column_info.filter((col) => selectedColumns.has(col.name)),
    [props.table.column_info, selectedColumns],
  );

  const actions: CardAction[] = [
    {
      title: "View table data",
      onClick: () => {
        void navigate(
          originalDataCatalogLink(
            selectAllColumnsFromRawdataTable(
              props.tableName,
              selectedColumnInfo,
            ),
          ),
        );
      },
    },
  ];

  const columns: Column[] = useMemo(
    () => [
      {
        slug: COLUMN_SELECT_KEY,
        renderCell: (value: CellPrimitive) => {
          const columnName = String(value);
          return (
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={selectedColumns.has(columnName)}
                onChange={() => toggleColumn(columnName)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select column ${columnName}`}
                className="size-4 accent-accent cursor-pointer"
              />
            </div>
          );
        },
      },
      { slug: "Name", renderCell: renderColumnName },
      { slug: "Description" },
      { slug: "Unit" },
      {
        slug: "UCD",
        hint: (
          <p>
            Unified Content Descriptor. Describes astronomical quantities in a
            structured way. For more information see{" "}
            <Link
              href="https://www.ivoa.net/documents/latest/UCD.html"
              external
            >
              IVOA Recommendation
            </Link>
            .
          </p>
        ),
      },
    ],
    [selectedColumns],
  );

  const values: Record<string, CellPrimitive>[] = [];

  props.table.column_info
    .filter((col) => columnMatchesSearch(col, query))
    .forEach((col) => {
      values.push({
        [COLUMN_SELECT_KEY]: col.name,
        Name: col.name,
        Description: renderMetadataCell(
          col.name,
          "description",
          col.description,
        ),
        Unit: renderMetadataCell(col.name, "unit", col.unit),
        UCD: renderMetadataCell(col.name, "ucd", col.ucd, (ucd) =>
          renderUCD(ucd),
        ),
      });
    });

  return (
    <Card title="Column information" variant="block" actions={actions}>
      <div className="mb-4 max-w-md">
        <TextFilter
          value={query}
          onChange={setQuery}
          placeholder="Search column by name, description, or UCD"
        />
      </div>
      {patchError ? (
        <p className="mb-4 text-sm text-danger">{patchError}</p>
      ) : null}
      <CommonTable columns={columns} data={values} />
    </Card>
  );
}

async function fetcher(
  tableName: string | undefined,
): Promise<GetTableResponse> {
  if (!tableName) {
    throw new Error("No table name provided");
  }

  const response = await getTable({
    client: adminClient,
    query: { table_name: tableName },
  });
  if (response.error) {
    throw new Error(JSON.stringify(response.error));
  }

  return response.data.data;
}

export function TableDetailsPage(): ReactElement {
  const { tableName } = useParams<{ tableName: string }>();

  useEffect(() => {
    document.title = tableName ? `${tableName} | LEDA` : "Table | LEDA";
  }, [tableName]);

  const {
    data: table,
    loading,
    error,
  } = useDataFetching(() => fetcher(tableName), [tableName]);

  if (loading) return <Loading />;
  if (error) return <ErrorPage message={error} />;
  if (!table) return <ErrorPage message="Unknown error" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-5">
        <TableMeta
          tableName={tableName ?? ""}
          table={table}
          className="lg:col-span-6"
        />
        <TableProgressSummaryCard
          progress={table.progress}
          tableName={tableName ?? ""}
          className={
            Object.keys(table.progress.catalogs).length > 0
              ? "lg:col-span-3"
              : "lg:col-span-6"
          }
        />
        {Object.keys(table.progress.catalogs).length > 0 ? (
          <CatalogProgressCard
            catalogs={table.progress.catalogs}
            totalRecords={table.progress.total_records}
            className="lg:col-span-3"
          />
        ) : null}
      </div>
      <ColumnInfo tableName={tableName ?? ""} table={table} />
    </div>
  );
}
