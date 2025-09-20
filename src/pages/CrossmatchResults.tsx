import { ReactElement, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/common-table";
import { Badge } from "../components/ui/badge";
import { DropdownFilter } from "../components/ui/dropdown-filter";
import { TextFilter } from "../components/ui/text-filter";
import { getCrossmatchRecordsAdminApiV1RecordsCrossmatchGet } from "../clients/admin/sdk.gen";
import type {
  GetRecordsCrossmatchResponse,
  RecordCrossmatch,
  RecordCrossmatchStatus,
  ValidationError,
} from "../clients/admin/types.gen";
import { getResource } from "../resources/resources";
import { Button } from "../components/ui/button";
import { Loading } from "../components/ui/loading";
import { ErrorPage } from "../components/ui/error-page";
import { Link } from "../components/ui/link";
import { useDataFetching } from "../hooks/useDataFetching";
import { Pagination } from "../components/ui/pagination";

interface CrossmatchFiltersProps {
  tableName: string | null;
  status: RecordCrossmatchStatus | null;
  pageSize: number;
  onApplyFilters: (tableName: string, status: string, pageSize: number) => void;
}

function CrossmatchFilters({
  tableName,
  status,
  pageSize,
  onApplyFilters,
}: CrossmatchFiltersProps): ReactElement {
  const [localStatus, setLocalStatus] = useState<string>(status || "all");
  const [localPageSize, setLocalPageSize] = useState<number>(pageSize);
  const [localTableName, setLocalTableName] = useState<string>(tableName || "");

  useEffect(() => {
    setLocalStatus(status || "all");
    setLocalPageSize(pageSize);
    setLocalTableName(tableName || "");
  }, [status, pageSize, tableName]);

  function applyFilters(): void {
    onApplyFilters(localTableName, localStatus, localPageSize);
  }

  return (
    <div className="flex gap-4 mb-4">
      <TextFilter
        title="Table name"
        value={localTableName}
        onChange={setLocalTableName}
        placeholder="Enter table name"
        onEnter={applyFilters}
      />
      <Link href={`/table/${localTableName.trim()}`} external />
      <DropdownFilter
        title="Status"
        options={[
          { value: "all", label: "All Statuses" },
          { value: "unprocessed", label: "Unprocessed" },
          { value: "new", label: "New" },
          { value: "collided", label: "Collided" },
          { value: "existing", label: "Existing" },
        ]}
        value={localStatus}
        onChange={setLocalStatus}
      />
      <DropdownFilter
        title="Page size"
        options={[
          { value: "10" },
          { value: "25" },
          { value: "50" },
          { value: "100" },
        ]}
        value={localPageSize.toString()}
        onChange={(value) => setLocalPageSize(parseInt(value))}
      />
      <div className="flex items-end">
        <Button onClick={applyFilters}>Apply</Button>
      </div>
    </div>
  );
}

interface CrossmatchResultsProps {
  data: GetRecordsCrossmatchResponse | null;
}

function CrossmatchResults({ data }: CrossmatchResultsProps): ReactElement {
  function getRecordName(record: RecordCrossmatch): ReactElement {
    const displayName = record.catalogs.designation?.name || record.record_id;
    return (
      <Link href={`/records/${record.record_id}/crossmatch`}>
        {displayName}
      </Link>
    );
  }

  function renderCandidates(record: RecordCrossmatch): ReactElement {
    let pgcNumbers: number[] = [];

    if (record.status === "existing" && record.metadata.pgc) {
      pgcNumbers = [record.metadata.pgc];
    } else if (record.status === "collided") {
      pgcNumbers = record.metadata.possible_matches ?? [];
    }

    return (
      <>
        {pgcNumbers.map((pgc, index) => (
          <Badge key={`${pgc}-${index}`} href={`/object/${pgc}`}>
            {pgc}
          </Badge>
        ))}
      </>
    );
  }

  function getStatusLabel(status: RecordCrossmatchStatus): string {
    return getResource(`crossmatch.status.${status}`).Title;
  }

  const columns: Column[] = [
    {
      name: "Record name",
      renderCell: (recordIndex: CellPrimitive) => {
        if (typeof recordIndex === "number" && data?.records[recordIndex]) {
          return getRecordName(data.records[recordIndex]);
        }
        return <span>NULL</span>;
      },
    },
    { name: "Status" },
    {
      name: "Candidates",
      renderCell: (recordIndex: CellPrimitive) => {
        if (typeof recordIndex === "number" && data?.records[recordIndex]) {
          return renderCandidates(data.records[recordIndex]);
        }
        return <span>NULL</span>;
      },
    },
  ];

  const tableData: Record<string, CellPrimitive>[] =
    data?.records.map((record: RecordCrossmatch, index: number) => ({
      "Record name": index,
      Status: getStatusLabel(record.status),
      Candidates: index,
    })) || [];

  return <CommonTable columns={columns} data={tableData} />;
}

async function fetcher(
  tableName: string | null,
  status: RecordCrossmatchStatus | null,
  page: number,
  pageSize: number,
): Promise<GetRecordsCrossmatchResponse> {
  if (!tableName) {
    throw new Error("Table name is required");
  }

  const response = await getCrossmatchRecordsAdminApiV1RecordsCrossmatchGet({
    query: {
      table_name: tableName,
      status: status,
      page: page,
      page_size: pageSize,
    },
  });

  if (response.error) {
    throw new Error(
      response.error.detail
        ?.map((err: ValidationError) => err.msg)
        .join(", ") || "Failed to fetch crossmatch records",
    );
  }

  if (!response.data) {
    throw new Error("No data received from server");
  }

  return response.data.data;
}

export function CrossmatchResultsPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  const tableName = searchParams.get("table_name");
  const status = searchParams.get("status") as RecordCrossmatchStatus | null;
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("page_size") || "25");

  useEffect(() => {
    document.title = `Crossmatch - ${tableName} | HyperLEDA`;
  }, [tableName]);

  const { data, loading, error } = useDataFetching(
    () => fetcher(tableName, status, page, pageSize),
    [tableName, status, page, pageSize],
  );

  function handlePageChange(newPage: number): void {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", newPage.toString());
    setSearchParams(newSearchParams);
  }

  function handleApplyFilters(
    newTableName: string,
    newStatus: string,
    newPageSize: number,
  ): void {
    const newSearchParams = new URLSearchParams(searchParams);

    if (newTableName.trim()) {
      newSearchParams.set("table_name", newTableName.trim());
    } else {
      newSearchParams.delete("table_name");
    }

    if (newStatus === "all") {
      newSearchParams.delete("status");
    } else {
      newSearchParams.set("status", newStatus);
    }

    newSearchParams.set("page_size", newPageSize.toString());
    newSearchParams.set("page", "0");

    setSearchParams(newSearchParams);
  }

  function Content(): ReactElement {
    if (loading) return <Loading />;
    if (error) return <ErrorPage title="Error" message={error} />;
    if (!data?.records) return <ErrorPage title="Error" message="No records" />;

    return (
      <>
        <CrossmatchResults data={data} />
        <Pagination
          page={page}
          pageSize={pageSize}
          records={data?.records}
          handlePageChange={handlePageChange}
        />
      </>
    );
  }

  return (
    <>
      <h2 className="text-3xl font-bold mb-4">Crossmatch results</h2>
      <CrossmatchFilters
        tableName={tableName}
        status={status}
        pageSize={pageSize}
        onApplyFilters={handleApplyFilters}
      />
      <Content />
    </>
  );
}
