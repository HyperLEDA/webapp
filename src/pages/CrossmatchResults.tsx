import { ReactElement, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/CommonTable";
import { Badge } from "../components/ui/Badge";
import { DropdownFilter } from "../components/core/DropdownFilter";
import { TextFilter } from "../components/core/TextFilter";
import { getCrossmatchRecords } from "../clients/admin/sdk.gen";
import type {
  GetRecordsCrossmatchResponse,
  RecordCrossmatch,
  RecordCrossmatchStatus,
  RecordTriageStatus,
  ValidationError,
} from "../clients/admin/types.gen";
import { getResource } from "../resources/resources";
import { Button } from "../components/core/Button";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import { Link } from "../components/core/Link";
import { useDataFetching } from "../hooks/useDataFetching";
import { Pagination } from "../components/ui/Pagination";
import { adminClient } from "../clients/config";

interface CrossmatchFiltersProps {
  tableName: string | null;
  status: RecordCrossmatchStatus | null;
  triageStatus: string | null;
  pageSize: number;
  onApplyFilters: (
    tableName: string,
    status: string,
    triageStatus: string,
    pageSize: number,
  ) => void;
}

function CrossmatchFilters({
  tableName,
  status,
  triageStatus,
  pageSize,
  onApplyFilters,
}: CrossmatchFiltersProps): ReactElement {
  const [localStatus, setLocalStatus] = useState<string>(status || "all");
  const [localTriageStatus, setLocalTriageStatus] = useState<string>(
    triageStatus ?? "pending",
  );
  const [localPageSize, setLocalPageSize] = useState<number>(pageSize);
  const [localTableName, setLocalTableName] = useState<string>(tableName || "");

  useEffect(() => {
    setLocalStatus(status || "all");
    setLocalTriageStatus(triageStatus ?? "pending");
    setLocalPageSize(pageSize);
    setLocalTableName(tableName || "");
  }, [status, triageStatus, pageSize, tableName]);

  function applyFilters(): void {
    onApplyFilters(
      localTableName,
      localStatus,
      localTriageStatus,
      localPageSize,
    );
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
        title="Manual check status"
        options={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "resolved", label: "Resolved" },
        ]}
        value={localTriageStatus}
        onChange={setLocalTriageStatus}
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
  loading?: boolean;
}

function CrossmatchResults({
  data,
  loading,
}: CrossmatchResultsProps): ReactElement {
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

  function getTriageStatusLabel(triageStatus: RecordTriageStatus): string {
    return getResource(`crossmatch.triage.${triageStatus}`).Title;
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
    { name: "Manual check status" },
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
      "Manual check status": getTriageStatusLabel(record.triage_status),
      Candidates: index,
    })) || [];

  return <CommonTable columns={columns} data={tableData} loading={loading} />;
}

async function fetcher(
  tableName: string | null,
  status: RecordCrossmatchStatus | null,
  triageStatus: RecordTriageStatus | null,
  page: number,
  pageSize: number,
): Promise<GetRecordsCrossmatchResponse> {
  if (!tableName) {
    throw new Error("Table name is required");
  }

  const response = await getCrossmatchRecords({
    client: adminClient,
    query: {
      table_name: tableName,
      status: status,
      triage_status: triageStatus,
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
  const triageStatusParam = searchParams.get("triage_status");
  const apiTriageStatus: RecordTriageStatus | null =
    triageStatusParam === null || triageStatusParam === ""
      ? "pending"
      : triageStatusParam === "all"
        ? null
        : (triageStatusParam as RecordTriageStatus);
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("page_size") || "25");

  useEffect(() => {
    document.title = `Crossmatch - ${tableName} | HyperLEDA`;
  }, [tableName]);

  const { data, loading, error } = useDataFetching(
    () => fetcher(tableName, status, apiTriageStatus, page, pageSize),
    [tableName, status, apiTriageStatus, page, pageSize],
  );

  function handlePageChange(newPage: number): void {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", newPage.toString());
    setSearchParams(newSearchParams);
  }

  function handleApplyFilters(
    newTableName: string,
    newStatus: string,
    newTriageStatus: string,
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

    if (newTriageStatus === "all") {
      newSearchParams.set("triage_status", "all");
    } else {
      newSearchParams.set("triage_status", newTriageStatus);
    }

    newSearchParams.set("page_size", newPageSize.toString());
    newSearchParams.set("page", "0");

    setSearchParams(newSearchParams);
  }

  function Content(): ReactElement {
    if (error && !data) return <ErrorPage title="Error" message={error} />;
    if (!data?.records && loading) return <Loading />;
    if (!data?.records) return <ErrorPage title="Error" message="No records" />;

    return (
      <>
        <CrossmatchResults data={data} loading={loading} />
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
        triageStatus={triageStatusParam}
        pageSize={pageSize}
        onApplyFilters={handleApplyFilters}
      />
      <Content />
    </>
  );
}
