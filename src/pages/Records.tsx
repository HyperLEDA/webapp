import { ReactElement, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/CommonTable";
import { DropdownFilter } from "../components/core/DropdownFilter";
import { TextFilter } from "../components/core/TextFilter";
import { getRecords } from "../clients/admin/sdk.gen";
import type {
  GetRecordsResponse,
  Record as RecordType,
  CrossmatchTriageStatus,
} from "../clients/admin/types.gen";
import { getResource } from "../resources/resources";
import { Button } from "../components/core/Button";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import { Badge } from "../components/ui/Badge";
import { Link } from "../components/core/Link";
import { useDataFetching } from "../hooks/useDataFetching";
import { Pagination } from "../components/ui/Pagination";
import { adminClient } from "../clients/config";
import type { ValidationError } from "../clients/admin/types.gen";

interface RecordsFiltersProps {
  tableName: string | null;
  triageStatus: string | null;
  pageSize: number;
  onApplyFilters: (
    tableName: string,
    triageStatus: string,
    pageSize: number,
  ) => void;
}

function RecordsFilters({
  tableName,
  triageStatus,
  pageSize,
  onApplyFilters,
}: RecordsFiltersProps): ReactElement {
  const [localTriageStatus, setLocalTriageStatus] = useState<string>(
    triageStatus ?? "all",
  );
  const [localPageSize, setLocalPageSize] = useState<number>(pageSize);
  const [localTableName, setLocalTableName] = useState<string>(tableName || "");

  useEffect(() => {
    setLocalTriageStatus(triageStatus ?? "all");
    setLocalPageSize(pageSize);
    setLocalTableName(tableName || "");
  }, [triageStatus, pageSize, tableName]);

  function applyFilters(): void {
    onApplyFilters(localTableName, localTriageStatus, localPageSize);
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
        title="Manual check status"
        options={[
          { value: "all", label: "All" },
          { value: "unprocessed", label: "Unprocessed" },
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

interface RecordsTableProps {
  data: GetRecordsResponse | null;
  loading?: boolean;
  showCandidates?: boolean;
}

function RecordsTable({
  data,
  loading,
  showCandidates = false,
}: RecordsTableProps): ReactElement {
  function getRecordName(record: RecordType): ReactElement {
    const displayName = record.catalogs?.designation?.name || record.id;
    return <Link href={`/records/${record.id}/crossmatch`}>{displayName}</Link>;
  }

  function getTriageStatusLabel(status: CrossmatchTriageStatus): string {
    return getResource(`crossmatch.triage.${status}`).Title;
  }

  function renderCandidates(record: RecordType): ReactElement {
    const pgcNumbers = record.crossmatch.candidates.map((c) => c.pgc);
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

  const nameHint = data?.schema?.catalogs?.designation?.description?.name;

  const columns: Column[] = [
    {
      name: "Name",
      hint: nameHint ? <p>{nameHint}</p> : undefined,
      renderCell: (recordIndex: CellPrimitive) => {
        if (typeof recordIndex === "number" && data?.records[recordIndex]) {
          return getRecordName(data.records[recordIndex]);
        }
        return <span>—</span>;
      },
    },
    {
      name: "Manual check status",
      renderCell: (recordIndex: CellPrimitive) => {
        if (typeof recordIndex === "number" && data?.records[recordIndex]) {
          return getTriageStatusLabel(
            data.records[recordIndex].crossmatch.triage_status,
          );
        }
        return <span>—</span>;
      },
    },
    {
      name: "Nature",
      renderCell: (recordIndex: CellPrimitive) => {
        if (typeof recordIndex === "number" && data?.records[recordIndex]) {
          const typeName =
            data.records[recordIndex].catalogs?.nature?.type_name;
          return <span>{typeName ?? "—"}</span>;
        }
        return <span>—</span>;
      },
    },
    ...(showCandidates
      ? [
          {
            name: "Candidates",
            renderCell: (recordIndex: CellPrimitive) => {
              if (
                typeof recordIndex === "number" &&
                data?.records[recordIndex]
              ) {
                return renderCandidates(data.records[recordIndex]);
              }
              return <span>—</span>;
            },
          },
        ]
      : []),
  ];

  const tableData: Record<string, CellPrimitive>[] =
    data?.records.map((_record: RecordType, index: number) => {
      const row: Record<string, CellPrimitive> = {
        Name: index,
        "Manual check status": index,
        Nature: index,
      };
      if (showCandidates) {
        row["Candidates"] = index;
      }
      return row;
    }) || [];

  return <CommonTable columns={columns} data={tableData} loading={loading} />;
}

async function fetcher(
  tableName: string | null,
  triageStatus: CrossmatchTriageStatus | null,
  page: number,
  pageSize: number,
): Promise<GetRecordsResponse> {
  if (!tableName) {
    throw new Error("Table name is required");
  }

  const response = await getRecords({
    client: adminClient,
    query: {
      table_name: tableName,
      triage_status: triageStatus,
      page,
      page_size: pageSize,
    },
  });

  if (response.error) {
    throw new Error(
      response.error.detail
        ?.map((err: ValidationError) => err.msg)
        .join(", ") || "Failed to fetch records",
    );
  }

  if (!response.data) {
    throw new Error("No data received from server");
  }

  return response.data.data;
}

export function RecordsPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  const tableName = searchParams.get("table_name");
  const triageStatusParam = searchParams.get("triage_status");
  const apiTriageStatus: CrossmatchTriageStatus | null =
    triageStatusParam === null || triageStatusParam === ""
      ? null
      : triageStatusParam === "all"
        ? null
        : (triageStatusParam as CrossmatchTriageStatus);
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("page_size") || "25");

  useEffect(() => {
    document.title = `Records${tableName ? ` - ${tableName}` : ""} | HyperLEDA`;
  }, [tableName]);

  const { data, loading, error } = useDataFetching(
    () => fetcher(tableName, apiTriageStatus, page, pageSize),
    [tableName, apiTriageStatus, page, pageSize],
  );

  function handlePageChange(newPage: number): void {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", newPage.toString());
    setSearchParams(newSearchParams);
  }

  function handleApplyFilters(
    newTableName: string,
    newTriageStatus: string,
    newPageSize: number,
  ): void {
    const newSearchParams = new URLSearchParams(searchParams);

    if (newTableName.trim()) {
      newSearchParams.set("table_name", newTableName.trim());
    } else {
      newSearchParams.delete("table_name");
    }

    if (newTriageStatus === "all") {
      newSearchParams.delete("triage_status");
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
        <RecordsTable
          data={data}
          loading={loading}
          showCandidates={triageStatusParam === "pending"}
        />
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
      <h2 className="text-3xl font-bold mb-4">Records</h2>
      <RecordsFilters
        tableName={tableName}
        triageStatus={triageStatusParam}
        pageSize={pageSize}
        onApplyFilters={handleApplyFilters}
      />
      <Content />
    </>
  );
}
