import { ReactElement, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/common-table";
import { Badge } from "../components/ui/badge";
import { Dropdown } from "../components/ui/dropdown";
import { getCrossmatchRecordsAdminApiV1RecordsCrossmatchGet } from "../clients/admin/sdk.gen";
import type {
  GetRecordsCrossmatchResponse,
  RecordCrossmatch,
  RecordCrossmatchStatus,
  HttpValidationError,
  ValidationError,
} from "../clients/admin/types.gen";
import { getResource } from "../resources/resources";
import { Button } from "../components/ui/button";

export function CrossmatchResultsPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [data, setData] = useState<GetRecordsCrossmatchResponse | null>(null);
  const [error, setError] = useState<HttpValidationError | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const tableName = searchParams.get("table_name");
  const status = searchParams.get("status") as RecordCrossmatchStatus | null;
  const page = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("page_size") || "25");

  useEffect(() => {
    async function fetchData() {
      if (!tableName) {
        navigate("/");
        return;
      }

      try {
        setLoading(true);
        const response =
          await getCrossmatchRecordsAdminApiV1RecordsCrossmatchGet({
            query: {
              table_name: tableName,
              status: status || undefined,
              page: page,
              page_size: pageSize,
            },
          });

        if (response.error) {
          setError(response.error);
          return;
        }

        if (response.data) {
          setData(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching crossmatch records", err);
        setError({
          detail: [
            {
              loc: [],
              msg: "Failed to fetch crossmatch records",
              type: "value_error",
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tableName, status, page, pageSize, navigate]);

  function handlePageChange(newPage: number): void {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", newPage.toString());
    setSearchParams(newSearchParams);
  }

  function handlePageSizeChange(newPageSize: number): void {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page_size", newPageSize.toString());
    newSearchParams.set("page", "0");
    setSearchParams(newSearchParams);
  }

  function handleStatusChange(newStatus: string): void {
    const newSearchParams = new URLSearchParams(searchParams);
    if (newStatus === "all") {
      newSearchParams.delete("status");
    } else {
      newSearchParams.set("status", newStatus);
    }
    newSearchParams.set("page", "0");
    setSearchParams(newSearchParams);
  }

  function getRecordName(record: RecordCrossmatch): string {
    return record.catalogs.designation?.name || record.record_id;
  }

  function renderCandidates(record: RecordCrossmatch): ReactElement {
    if (record.status === "new") {
      return <span>NULL</span>;
    }

    if (record.status === "existing" && record.metadata.pgc) {
      const pgcText = `${record.metadata.pgc}`;
      return <Badge href={`/object/${record.metadata.pgc}`}>{pgcText}</Badge>;
    }

    if (record.status === "collided" && record.metadata.possible_matches) {
      const pgcNumbers = record.metadata.possible_matches;

      return (
        <div>
          {pgcNumbers.map((pgc: number, index: number) => (
            <Badge key={`${pgc}-${index}`} href={`/object/${pgc}`}>
              {pgc}
            </Badge>
          ))}
        </div>
      );
    }

    return <span>NULL</span>;
  }

  function getStatusLabel(status: RecordCrossmatchStatus): string {
    return getResource(`crossmatch.status.${status}`).Title;
  }

  const columns: Column[] = [
    { name: "Record Name" },
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
      "Record Name": getRecordName(record),
      Status: getStatusLabel(record.status),
      Candidates: index,
    })) || [];

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-300 text-lg">Loading crossmatch results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900 border border-red-700 rounded p-4">
          <h2 className="text-xl font-bold text-red-200 mb-2">Error</h2>
          <p className="text-red-300">
            {error.detail?.map((err: ValidationError) => err.msg).join(", ") ||
              "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  if (!tableName) {
    return (
      <div className="p-8">
        <div className="bg-yellow-900 border border-yellow-700 rounded p-4">
          <h2 className="text-xl font-bold text-yellow-200 mb-2">
            Missing Table Name
          </h2>
          <p className="text-yellow-300">
            Please provide a table_name parameter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-4">
          Crossmatch Results for {tableName}
        </h1>

        <div className="flex gap-4 mb-4">
          <Dropdown
            title="Status Filter"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "unprocessed", label: "Unprocessed" },
              { value: "new", label: "New" },
              { value: "collided", label: "Collided" },
              { value: "existing", label: "Existing" },
            ]}
            defaultValue="all"
            value={status || "all"}
            onChange={handleStatusChange}
          />

          <Dropdown
            title="Page Size"
            options={[
              { value: "10" },
              { value: "25" },
              { value: "50" },
              { value: "100" },
            ]}
            defaultValue="25"
            value={pageSize.toString()}
            onChange={(value) => handlePageSizeChange(parseInt(value))}
          />
        </div>
      </div>

      <CommonTable columns={columns} data={tableData} className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Crossmatch Records</h2>
          <div className="text-sm text-gray-400">
            Showing {tableData.length} records
          </div>
        </div>
      </CommonTable>

      <div className="flex justify-between items-center">
        <Button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 0}
        >
          Previous
        </Button>
        <span className="text-gray-300">Page {page + 1}</span>
        <Button
          onClick={() => handlePageChange(page + 1)}
          disabled={tableData.length < pageSize}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
