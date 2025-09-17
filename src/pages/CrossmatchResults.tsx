import { ReactElement, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  HttpValidationError,
  ValidationError,
} from "../clients/admin/types.gen";
import { getResource } from "../resources/resources";
import { Button } from "../components/ui/button";
import { Loading } from "../components/ui/loading";
import { ErrorPage, ErrorPageHomeButton } from "../components/ui/error-page";
import { LinkButton } from "../components/ui/link-button";

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

  const [localStatus, setLocalStatus] = useState<string>(status || "all");
  const [localPageSize, setLocalPageSize] = useState<number>(pageSize);
  const [localTableName, setLocalTableName] = useState<string>(tableName || "");

  useEffect(() => {
    setLocalStatus(status || "all");
    setLocalPageSize(pageSize);
    setLocalTableName(tableName || "");
  }, [status, pageSize, tableName]);

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

  function applyFilters(): void {
    const newSearchParams = new URLSearchParams(searchParams);

    if (localTableName.trim()) {
      newSearchParams.set("table_name", localTableName.trim());
    } else {
      newSearchParams.delete("table_name");
    }

    if (localStatus === "all") {
      newSearchParams.delete("status");
    } else {
      newSearchParams.set("status", localStatus);
    }

    newSearchParams.set("page_size", localPageSize.toString());
    newSearchParams.set("page", "0");

    setSearchParams(newSearchParams);
  }

  function getRecordName(record: RecordCrossmatch): ReactElement {
    const displayName = record.catalogs.designation?.name || record.record_id;
    return (
      <LinkButton to={`/records/${record.record_id}/crossmatch`}>
        {displayName}
      </LinkButton>
    );
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
    {
      name: "Record Name",
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
      "Record Name": index,
      Status: getStatusLabel(record.status),
      Candidates: index,
    })) || [];

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <ErrorPage
        title="Error"
        message={
          error.detail?.map((err: ValidationError) => err.msg).join(", ") ||
          "An error occurred"
        }
        className="p-8"
      >
        <ErrorPageHomeButton onClick={() => navigate("/")} />
      </ErrorPage>
    );
  }

  if (!tableName) {
    return (
      <ErrorPage
        title="Missing table name"
        message="Please provide a table_name parameter."
        className="p-8"
      >
        <ErrorPageHomeButton onClick={() => navigate("/")} />
      </ErrorPage>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-4">Crossmatch results</h2>

        <div className="flex gap-4 mb-4">
          <LinkButton to={`/table/${localTableName.trim()}`}>
            <TextFilter
              title="Table name"
              value={localTableName}
              onChange={setLocalTableName}
              placeholder="Enter table name"
              onEnter={applyFilters}
            />
          </LinkButton>
          <DropdownFilter
            title="Status filter"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "unprocessed", label: "Unprocessed" },
              { value: "new", label: "New" },
              { value: "collided", label: "Collided" },
              { value: "existing", label: "Existing" },
            ]}
            defaultValue="all"
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
            defaultValue="25"
            value={localPageSize.toString()}
            onChange={(value) => setLocalPageSize(parseInt(value))}
          />
          <div className="flex items-end">
            <Button onClick={applyFilters}>Apply</Button>
          </div>
        </div>
      </div>

      <CommonTable columns={columns} data={tableData} className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Crossmatch records</h2>
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
