import { KeyboardEvent, ReactElement, useEffect, useState } from "react";
import {
  Bibliography,
  CrossmatchTriageStatus,
  DataType,
  GetTableResponse,
  TableCrossmatchResultStatus,
} from "../clients/admin/types.gen";
import { getTable, patchTable } from "../clients/admin/sdk.gen";
import { useNavigate, useParams } from "react-router-dom";
import { MdEdit } from "react-icons/md";
import {
  CellPrimitive,
  Column,
  CommonTable,
} from "../components/ui/CommonTable";
import { Button } from "../components/core/Button";
import { CopyButton } from "../components/ui/CopyButton";
import { Badge, BadgeType } from "../components/ui/Badge";
import { Link } from "../components/core/Link";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
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
  let authors = "";

  if (bib.authors.length >= 1) {
    authors += bib.authors[0];
  }
  if (bib.authors.length >= 2) {
    authors += " et al.";
  }

  authors += ` ${bib.year}`;

  const targetLink =
    "https://ui.adsabs.harvard.edu/abs/" + bib.bibcode + "/abstract";

  return (
    <CopyButton textToCopy={bib.bibcode}>
      <div>
        <Link href={targetLink} external>
          {bib.bibcode}
        </Link>{" "}
        | {authors}: "{bib.title}"
      </div>
    </CopyButton>
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
}

function TableMeta(props: TableMetaProps): ReactElement {
  const navigate = useNavigate();
  const canEdit = isLoggedIn();
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const showEditPencils = canEdit && !editingName && !editingDescription;
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

  const columns = [{ name: "Parameter" }, { name: "Value" }];

  const datatypeValue: CellPrimitive = canEdit ? (
    <select
      value={asDataType(props.table.meta.datatype)}
      onChange={(event) => void commitDatatype(event.target.value as DataType)}
      disabled={savingField !== null}
      className="bg-transparent border border-gray-500 rounded px-2 py-1 text-gray-200 max-w-xs"
    >
      {DATA_TYPES.map((option) => (
        <option key={option} value={option} className="bg-gray-800">
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </option>
      ))}
    </select>
  ) : (
    String(props.table.meta.datatype)
  );

  const values: Record<string, CellPrimitive>[] = [
    {
      Parameter: "Table ID",
      Value: props.table.id,
    },
    {
      Parameter: "Source paper",
      Value: renderBibliography(props.table.bibliography),
    },
    {
      Parameter: "Number of records",
      Value: props.table.rows_num,
    },
    {
      Parameter: "Type of data",
      Value: datatypeValue,
    },
    {
      Parameter: "Modification time",
      Value: renderTime(props.table.meta.modification_dt as string),
    },
  ];

  return (
    <CommonTable columns={columns} data={values} className="pb-5">
      <div className="flex items-start gap-2 mb-2">
        {editingDescription ? (
          <input
            type="text"
            value={draftDescription}
            onChange={(event) => setDraftDescription(event.target.value)}
            onKeyDown={handleDescriptionKeyDown}
            disabled={savingField === "description"}
            className="text-2xl font-bold bg-transparent border border-gray-500 rounded px-2 py-0.5 flex-1 min-w-0 text-white"
            autoFocus
          />
        ) : (
          <h2 className="text-2xl font-bold flex-1 min-w-0">
            {props.table.description}
          </h2>
        )}
        {showEditPencils && (
          <button
            type="button"
            aria-label="Edit table description"
            className="shrink-0 p-1 rounded text-gray-400 hover:text-white cursor-pointer"
            onClick={() => {
              setPatchError(null);
              setEditingDescription(true);
            }}
          >
            <MdEdit className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {editingName ? (
          <input
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={handleNameKeyDown}
            disabled={savingField === "name"}
            className="text-gray-300 font-mono bg-transparent border border-gray-500 rounded px-2 py-0.5 flex-1 min-w-0"
            autoFocus
          />
        ) : (
          <p className="text-gray-300 font-mono flex-1 min-w-0 break-all">
            {props.tableName}
          </p>
        )}
        {showEditPencils && (
          <button
            type="button"
            aria-label="Edit table name"
            className="shrink-0 p-1 rounded text-gray-400 hover:text-white cursor-pointer"
            onClick={() => {
              setPatchError(null);
              setEditingName(true);
            }}
          >
            <MdEdit className="w-5 h-5" />
          </button>
        )}
      </div>
      {patchError ? (
        <p className="text-sm text-red-400 mt-2">{patchError}</p>
      ) : null}
    </CommonTable>
  );
}

interface CrossmatchStatsProps {
  table: GetTableResponse;
  tableName: string;
  navigate: (path: string) => void;
}

function CrossmatchStats(props: CrossmatchStatsProps): ReactElement {
  const columns: Column[] = [{ name: "Status" }, { name: "Count" }];

  const values: Record<string, CellPrimitive>[] = [];

  if (!props.table.crossmatch) {
    return <div></div>;
  }

  const triageLabels: Record<CrossmatchTriageStatus, string> = {
    unprocessed: "Unprocessed",
    pending: "Pending",
    resolved: "Resolved",
  };
  const resultLabels: Record<TableCrossmatchResultStatus, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    done: "Done",
  };
  const resultBadgeTypes: Record<TableCrossmatchResultStatus, BadgeType> = {
    not_started: "info",
    in_progress: "warning",
    done: "success",
  };
  const triageOrder: CrossmatchTriageStatus[] = [
    "unprocessed",
    "pending",
    "resolved",
  ];

  triageOrder.forEach((status) => {
    const count = props.table.crossmatch.statuses[status] ?? 0;
    if (count <= 0) {
      return;
    }
    values.push({
      Status: triageLabels[status],
      Count: count,
    });
  });

  function handleViewCrossmatchResults(event: React.MouseEvent): void {
    const url = `/crossmatch?table_name=${encodeURIComponent(props.tableName)}&triage_status=pending`;

    if (event.ctrlKey || event.metaKey) {
      window.open(url, "_blank");
    } else {
      props.navigate(url);
    }
  }

  return (
    <CommonTable columns={columns} data={values} className="pb-5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Crossmatch</h2>
          <Badge type={resultBadgeTypes[props.table.crossmatch.result]}>
            {resultLabels[props.table.crossmatch.result]}
          </Badge>
        </div>
        <Button onClick={handleViewCrossmatchResults}>
          View crossmatch results
        </Button>
      </div>
    </CommonTable>
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
    <CommonTable columns={columns} data={values}>
      <h2 className="text-2xl font-bold">Column information</h2>
    </CommonTable>
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
        <>
          <TableMeta
            tableName={tableName ?? ""}
            table={payload}
            onAfterPatch={() => setRefreshKey((key) => key + 1)}
          />
          <CrossmatchStats
            table={payload}
            tableName={tableName ?? ""}
            navigate={navigate}
          />
          <ColumnInfo table={payload} />
        </>
      );
    }

    return <ErrorPage message="Unknown error" />;
  }

  return <Content />;
}
