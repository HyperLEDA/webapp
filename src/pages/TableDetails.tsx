import { ReactElement, useEffect, useState } from "react";
import {
  Bibliography,
  GetTableResponse,
  HttpValidationError,
} from "../clients/admin/types.gen";
import { getTableAdminApiV1TableGet } from "../clients/admin/sdk.gen";
import { useNavigate, useParams } from "react-router-dom";
import {
  CellPrimitive,
  Column,
  CommonTable,
} from "../components/ui/common-table";
import { CopyButton } from "../components/ui/copy-button";
import { Link } from "../components/ui/link";

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
        <Link href={targetLink}>{bib.bibcode}</Link> | {authors}: "{bib.title}"
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
    words.push(
      <div
        key={`${word}-${index}`}
        className="inline-block bg-gray-600 rounded px-1.5 py-0.5 text-sm mr-0.5 mb-0.5"
      >
        {word}
      </div>
    );
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
}

function TableMeta(props: TableMetaProps): ReactElement {
  const infoColumns = [{ name: "Parameter" }, { name: "Value" }];

  const infoValues: Record<string, CellPrimitive>[] = [
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
      Value: String(props.table.meta.datatype),
    },
    {
      Parameter: "Modification time",
      Value: renderTime(props.table.meta.modification_dt as string),
    },
  ];

  return (
    <CommonTable columns={infoColumns} data={infoValues} className="pb-5">
      <h2 className="text-2xl font-bold text-white mb-2">
        {props.table.description}
      </h2>
      <p className="text-gray-300 font-mono">{props.tableName}</p>
    </CommonTable>
  );
}

interface ColumnInfoProps {
  table: GetTableResponse;
}

function ColumnInfo(props: ColumnInfoProps): ReactElement {
  const columnInfoColumns: Column[] = [
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
          <Link href="https://www.ivoa.net/documents/latest/UCD.html">
            IVOA Recommendation
          </Link>
          .
        </p>
      ),
    },
  ];

  const columnInfoValues: Record<string, CellPrimitive>[] = [];

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

    columnInfoValues.push(colValue);
  });

  return (
    <CommonTable columns={columnInfoColumns} data={columnInfoValues}>
      <h2 className="text-2xl font-bold text-white">Column information</h2>
    </CommonTable>
  );
}

function renderNotFound(): ReactElement {
  return (
    <div className="text-center">
      <p className="text-gray-300">Table not found.</p>
    </div>
  );
}

function renderError(error: HttpValidationError): ReactElement {
  return (
    <div className="text-center">
      <p className="text-gray-300">{error.detail?.toString()}</p>
    </div>
  );
}

export function TableDetailsPage(): ReactElement {
  const { tableName } = useParams<{ tableName: string }>();
  const [table, setTable] = useState<GetTableResponse | null>(null);
  const [error, setError] = useState<HttpValidationError | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!tableName) {
        navigate("/");
        return;
      }

      try {
        const response = await getTableAdminApiV1TableGet({
          query: { table_name: tableName },
        });
        if (response.error) {
          setError(response.error);
          return;
        }

        if (response.data) {
          setTable(response.data.data);
        }
      } catch (err) {
        console.log("Error fetching table", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tableName, navigate]);

  return (
    <div className="p-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      ) : table ? (
        <div>
          <TableMeta tableName={tableName ?? ""} table={table} />
          <ColumnInfo table={table} />
        </div>
      ) : error ? (
        renderError(error)
      ) : (
        renderNotFound()
      )}
    </div>
  );
}
