import classNames from "classnames";
import { KeyboardEvent, ReactElement, useEffect, useState } from "react";
import {
  Bibliography,
  DataType,
  GetTableResponse,
  TableProgress,
} from "../clients/admin/types.gen";
import { getTable, patchTable } from "../clients/admin/sdk.gen";
import { useNavigate, useParams } from "react-router-dom";
import { MdEdit } from "react-icons/md";
import {
  CellPrimitive,
  Column,
  CommonTable,
} from "../components/ui/CommonTable";
import { CopyButton } from "../components/ui/CopyButton";
import { Badge } from "../components/ui/Badge";
import { Link } from "../components/core/Link";
import { Loading } from "../components/core/Loading";
import { Card, CardAction, Field } from "../components/ui/Card";
import { ErrorPage } from "../components/ui/ErrorPage";
import { Hint } from "../components/ui/Hint";
import { useDataFetching } from "../hooks/useDataFetching";
import { adminClient } from "../clients/config";
import { isLoggedIn } from "../auth/token";

const DATA_TYPES: DataType[] = [
  "regular",
  "reprocessing",
  "preliminary",
  "compilation",
];

function asDataType(value: unknown): DataType {
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
  const dt = new Date(time as string);

  return dt.toString();
}

function renderUCD(ucd: CellPrimitive): ReactElement {
  if (!(typeof ucd === "string")) {
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

interface TableMetaProps {
  tableName: string;
  table: GetTableResponse;
  onAfterPatch: () => void;
  className?: string;
}

function TableMeta(props: TableMetaProps): ReactElement {
  const navigate = useNavigate();
  const canEdit = isLoggedIn();
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const showNameEdit = canEdit && !editingDescription;
  const showSlugEdit = canEdit && !editingName;
  const [draftName, setDraftName] = useState(props.tableName);
  const [draftDescription, setDraftDescription] = useState(
    props.table.description,
  );
  const [savingField, setSavingField] = useState<
    "name" | "description" | "datatype" | null
  >(null);
  const [patchError, setPatchError] = useState<string | null>(null);

  async function runTablePatch(
    field: "name" | "description" | "datatype",
    body: {
      table_name: string;
      new_table_name?: string;
      description?: string;
      datatype?: DataType;
    },
    onSuccess: () => void,
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
      onSuccess();
    } catch (err) {
      setPatchError(`${err}`);
    } finally {
      setSavingField(null);
    }
  }

  useEffect(() => {
    if (!editingName) {
      setDraftName(props.tableName);
    }
  }, [props.tableName, editingName]);

  useEffect(() => {
    if (!editingDescription) {
      setDraftDescription(props.table.description);
    }
  }, [props.table.description, editingDescription]);

  async function commitName(): Promise<void> {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(props.tableName);
      setEditingName(false);
      setPatchError(null);
      return;
    }
    if (trimmed === props.tableName) {
      setEditingName(false);
      setPatchError(null);
      return;
    }
    await runTablePatch(
      "name",
      {
        table_name: props.tableName,
        new_table_name: trimmed,
      },
      () => {
        setEditingName(false);
        navigate(`/table/${encodeURIComponent(trimmed)}`);
      },
    );
  }

  async function commitDescription(): Promise<void> {
    const trimmed = draftDescription.trim();
    if (trimmed === props.table.description) {
      setEditingDescription(false);
      setPatchError(null);
      return;
    }
    await runTablePatch(
      "description",
      {
        table_name: props.tableName,
        description: trimmed,
      },
      () => {
        setEditingDescription(false);
        props.onAfterPatch();
      },
    );
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitName();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraftName(props.tableName);
      setEditingName(false);
      setPatchError(null);
    }
  }

  function handleDescriptionKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitDescription();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraftDescription(props.table.description);
      setEditingDescription(false);
      setPatchError(null);
    }
  }

  async function commitDatatype(next: DataType): Promise<void> {
    const current = asDataType(props.table.meta.datatype);
    if (next === current) {
      return;
    }
    await runTablePatch(
      "datatype",
      {
        table_name: props.tableName,
        datatype: next,
      },
      () => props.onAfterPatch(),
    );
  }

  const datatypeControl = canEdit ? (
    <select
      value={asDataType(props.table.meta.datatype)}
      onChange={(event) => void commitDatatype(event.target.value as DataType)}
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
    String(props.table.meta.datatype)
  );

  return (
    <Card title="Overview" variant="fields" className={props.className}>
      <Field label="Table name">
        <div className="flex items-center gap-2 min-w-0">
          {editingDescription ? (
            <input
              type="text"
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              onKeyDown={handleDescriptionKeyDown}
              disabled={savingField === "description"}
              className="bg-transparent border border-border rounded px-2 py-0.5 flex-1 min-w-0 text-primary"
              autoFocus
            />
          ) : (
            <span className="min-w-0">{props.table.description}</span>
          )}
          {showNameEdit && (
            <button
              type="button"
              aria-label="Edit table name"
              className="shrink-0 p-1 rounded text-muted hover:text-primary cursor-pointer"
              onClick={() => {
                setPatchError(null);
                setEditingDescription(true);
              }}
            >
              <MdEdit className="w-4 h-4" />
            </button>
          )}
        </div>
      </Field>
      <Field label="Slug">
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <input
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={handleNameKeyDown}
              disabled={savingField === "name"}
              className="font-mono bg-transparent border border-border rounded px-2 py-0.5 flex-1 min-w-0"
              autoFocus
            />
          ) : (
            <span className="font-mono min-w-0 break-all">
              {props.tableName}
            </span>
          )}
          {showSlugEdit && (
            <button
              type="button"
              aria-label="Edit table slug"
              className="shrink-0 p-1 rounded text-muted hover:text-primary cursor-pointer"
              onClick={() => {
                setPatchError(null);
                setEditingName(true);
              }}
            >
              <MdEdit className="w-4 h-4" />
            </button>
          )}
        </div>
      </Field>
      <Field label="Table ID">{props.table.id}</Field>
      <Field label="Source paper">
        {renderBibliography(props.table.bibliography)}
      </Field>
      <Field label="Number of records">{props.table.rows_num}</Field>
      <Field label="Type of data">{datatypeControl}</Field>
      <Field label="Modification time">
        {renderTime(props.table.meta.modification_dt as string)}
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

function TableProgressSummaryCard({
  progress,
  tableName,
  hasCrossmatch,
  navigate,
  className,
}: {
  progress: TableProgress;
  tableName: string;
  hasCrossmatch: boolean;
  navigate: (path: string) => void;
  className?: string;
}): ReactElement {
  const actions: CardAction[] = hasCrossmatch
    ? [
        {
          title: "View crossmatch results",
          onClick: () => {
            navigate(
              `/crossmatch?table_name=${encodeURIComponent(tableName)}&triage_status=pending`,
            );
          },
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
        {selectedProgress ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-base min-w-0 flex-1 content-start">
            <Field label="Marked">
              {formatProgressValue(selectedProgress.structured, totalRecords)}
            </Field>
            <Field label="Aggregated">
              {formatProgressValue(selectedProgress.in_layer2, totalRecords)}
            </Field>
            <Field label="Waiting for aggregation">
              {formatProgressValue(
                selectedProgress.layer2_pending,
                totalRecords,
              )}
            </Field>
          </dl>
        ) : null}
      </div>
    </Card>
  );
}

interface ColumnInfoProps {
  table: GetTableResponse;
}

function ColumnInfo(props: ColumnInfoProps): ReactElement {
  const columns: Column[] = [
    { name: "Name", renderCell: renderColumnName },
    { name: "Description" },
    { name: "Unit" },
    {
      name: "UCD",
      renderCell: renderUCD,
      hint: (
        <p>
          Unified Content Descriptor. Describes astronomical quantities in a
          structured way. For more information see{" "}
          <Link href="https://www.ivoa.net/documents/latest/UCD.html" external>
            IVOA Recommendation
          </Link>
          .
        </p>
      ),
    },
  ];

  const values: Record<string, CellPrimitive>[] = [];

  props.table.column_info.forEach((col) => {
    const colValue: Record<string, CellPrimitive> = {
      Name: col.name,
    };

    if (col.description) {
      colValue.Description = col.description;
    }
    if (col.unit) {
      colValue.Unit = col.unit;
    }
    if (col.ucd) {
      colValue.UCD = col.ucd;
    }

    values.push(colValue);
  });

  return (
    <Card title="Column information" variant="block">
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
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data: payload,
    loading,
    error,
  } = useDataFetching(() => fetcher(tableName), [tableName, refreshKey]);

  function Content(): ReactElement {
    if (loading) return <Loading />;
    if (error) return <ErrorPage message={error} />;
    if (payload) {
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-5">
            <TableMeta
              tableName={tableName ?? ""}
              table={payload}
              onAfterPatch={() => setRefreshKey((key) => key + 1)}
              className="lg:col-span-6"
            />
            <TableProgressSummaryCard
              progress={payload.progress}
              tableName={tableName ?? ""}
              hasCrossmatch={Boolean(payload.crossmatch)}
              navigate={navigate}
              className={
                Object.keys(payload.progress.catalogs).length > 0
                  ? "lg:col-span-3"
                  : "lg:col-span-6"
              }
            />
            {Object.keys(payload.progress.catalogs).length > 0 ? (
              <CatalogProgressCard
                catalogs={payload.progress.catalogs}
                totalRecords={payload.progress.total_records}
                className="lg:col-span-3"
              />
            ) : null}
          </div>
          <ColumnInfo table={payload} />
        </div>
      );
    }

    return <ErrorPage message="Unknown error" />;
  }

  return <Content />;
}
