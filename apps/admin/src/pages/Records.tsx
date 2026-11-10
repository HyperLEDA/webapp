import { ReactElement, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MdMyLocation } from "react-icons/md";
import { getRecords } from "../clients/admin";
import type {
  GetRecordsData,
  GetRecordsResponse,
  Record as ApiRecord,
  UploadStatus,
} from "../clients/admin";
import { adminClient } from "../clients";
import { adminTableUrl, publicObjectUrl } from "../origins";
import {
  Button,
  SkyViewer,
  CellPrimitive,
  Column,
  CommonTable,
  ErrorPage,
  Link,
  Loading,
  Pagination,
  type SkyViewerHandle,
} from "@leda/lib/ui";
import {
  DropdownFilter,
  NumberFilter,
  PageSizeFilter,
  TextFilter,
} from "../components/ui/filters";
import { useDataFetching } from "@leda/lib/hooks";
import { formatApiError } from "@leda/lib/tap";

const UPLOAD_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "uploaded", label: "Uploaded" },
  { value: "pending", label: "Pending" },
];

const PAGE_SIZES = [10, 25, 50, 100];
const MIN_ALADIN_FOV_DEG = 0.05;
const ALADIN_FOV_PADDING = 1.4;

interface SkySource {
  ra: number;
  dec: number;
  label: string;
  id: string;
}

function recordSkySources(records: ApiRecord[]): SkySource[] {
  return records.flatMap((record) => {
    const icrs = record.catalogs.icrs;
    if (!icrs || !Number.isFinite(icrs.ra) || !Number.isFinite(icrs.dec)) {
      return [];
    }
    return [
      {
        ra: icrs.ra,
        dec: icrs.dec,
        label: record.catalogs.designation?.name || record.id,
        id: record.id,
      },
    ];
  });
}

function skyViewForSources(sources: SkySource[]): {
  ra: number;
  dec: number;
  fov: number;
} | null {
  if (sources.length === 0) {
    return null;
  }

  const ra =
    sources.reduce((sum, source) => sum + source.ra, 0) / sources.length;
  const dec =
    sources.reduce((sum, source) => sum + source.dec, 0) / sources.length;

  if (sources.length === 1) {
    return { ra, dec, fov: MIN_ALADIN_FOV_DEG };
  }

  const raSpan =
    Math.max(...sources.map((source) => source.ra)) -
    Math.min(...sources.map((source) => source.ra));
  const decSpan =
    Math.max(...sources.map((source) => source.dec)) -
    Math.min(...sources.map((source) => source.dec));
  const fov =
    Math.max(raSpan, decSpan, MIN_ALADIN_FOV_DEG) * ALADIN_FOV_PADDING;

  return { ra, dec, fov };
}

interface RecordsQuery {
  tableName: string | null;
  page: number;
  pageSize: number;
  pgc: number | null;
  recordId: string | null;
  uploadStatus: UploadStatus | null;
}

interface AppliedFilters {
  tableName: string;
  pgc: string;
  recordId: string;
  uploadStatus: string;
  pageSize: number;
}

function parseUploadStatus(value: string | null): UploadStatus | null {
  if (value === "uploaded" || value === "pending") {
    return value;
  }
  return null;
}

function parsePgc(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }
  return parsed;
}

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function parsePageSize(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (PAGE_SIZES.includes(parsed)) {
    return parsed;
  }
  return 25;
}

function formatCatalogNumber(
  value: number | null | undefined,
  digits: number,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

function renderPgc(pgc: number | null | undefined): CellPrimitive {
  if (pgc === null || pgc === undefined || !Number.isInteger(pgc)) {
    return "—";
  }
  const objectLink = publicObjectUrl(pgc);
  return (
    <Link href={objectLink.href} external={objectLink.external}>
      {pgc}
    </Link>
  );
}

function renderLocate(
  record: ApiRecord,
  onLocate: (ra: number, dec: number) => void,
): CellPrimitive {
  const icrs = record.catalogs.icrs;
  if (!icrs || !Number.isFinite(icrs.ra) || !Number.isFinite(icrs.dec)) {
    return <div />;
  }
  return (
    <Button
      type="button"
      transparent
      hoverText="Locate"
      onClick={(event) => {
        event.stopPropagation();
        onLocate(icrs.ra, icrs.dec);
      }}
    >
      <MdMyLocation className="w-4 h-4 text-muted" />
    </Button>
  );
}

const columns: Column[] = [
  { slug: "", width: "fit" },
  { slug: "Name" },
  { slug: "Table" },
  { slug: "PGC" },
  { slug: "Redshift" },
  { slug: "Nature" },
];

function recordRows(
  records: ApiRecord[],
  onLocate: (ra: number, dec: number) => void,
): Record<string, CellPrimitive>[] {
  return records.map((record) => ({
    "": renderLocate(record, onLocate),
    Name: record.catalogs.designation?.name || record.id,
    Table: record.table_name ? (
      <Link href={adminTableUrl(record.table_name).href}>
        {record.table_name}
      </Link>
    ) : (
      "—"
    ),
    PGC: renderPgc(record.pgc),
    Redshift: formatCatalogNumber(record.catalogs.redshift?.z, 4),
    Nature: record.catalogs.nature?.type_name || "—",
  }));
}

interface RecordsFiltersProps {
  tableName: string;
  pgc: string;
  recordId: string;
  uploadStatus: string;
  pageSize: number;
  onApply: (filters: AppliedFilters) => void;
}

function RecordsFilters({
  tableName,
  pgc,
  recordId,
  uploadStatus,
  pageSize,
  onApply,
}: RecordsFiltersProps): ReactElement {
  const [localTableName, setLocalTableName] = useState(tableName);
  const [localPgc, setLocalPgc] = useState(pgc);
  const [localRecordId, setLocalRecordId] = useState(recordId);
  const [localUploadStatus, setLocalUploadStatus] = useState(uploadStatus);
  const [localPageSize, setLocalPageSize] = useState(pageSize);

  useEffect(() => {
    setLocalTableName(tableName);
    setLocalPgc(pgc);
    setLocalRecordId(recordId);
    setLocalUploadStatus(uploadStatus);
    setLocalPageSize(pageSize);
  }, [tableName, pgc, recordId, uploadStatus, pageSize]);

  const pgcActive = localPgc.trim() !== "";
  const uploadDisabled = pgcActive;

  function applyFilters(): void {
    onApply({
      tableName: localTableName,
      pgc: localPgc,
      recordId: localRecordId,
      uploadStatus: uploadDisabled ? "all" : localUploadStatus,
      pageSize: localPageSize,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <TextFilter
        title="Table name"
        value={localTableName}
        onChange={setLocalTableName}
        placeholder="Any"
        onEnter={applyFilters}
        defaultValue=""
      />
      <TextFilter
        title="Record ID"
        value={localRecordId}
        onChange={setLocalRecordId}
        placeholder="Any"
        onEnter={applyFilters}
        defaultValue=""
      />
      <NumberFilter
        title="PGC"
        value={localPgc}
        onChange={setLocalPgc}
        placeholder="Any"
        onEnter={applyFilters}
        defaultValue=""
      />
      <DropdownFilter
        title="Upload status"
        options={UPLOAD_STATUS_OPTIONS}
        value={uploadDisabled ? "all" : localUploadStatus}
        onChange={setLocalUploadStatus}
        disabled={uploadDisabled}
        defaultValue="all"
      />
      <PageSizeFilter
        pageSize={localPageSize}
        onPageSizeChange={setLocalPageSize}
        defaultValue={25}
      />
      <Button size="sm" onClick={applyFilters}>
        Apply
      </Button>
    </div>
  );
}

async function fetchRecords(
  query: RecordsQuery | null,
): Promise<GetRecordsResponse | null> {
  if (!query) {
    return null;
  }

  // SAFETY: The generated client still marks table_name required. The API accepts a missing table name, and undefined is omitted from the query string.
  const recordsQuery = {
    table_name: query.tableName ?? undefined,
    page: query.page,
    page_size: query.pageSize,
    pgc: query.pgc,
    record_id: query.recordId,
    upload_status: query.uploadStatus,
  } as GetRecordsData["query"];

  const response = await getRecords({
    client: adminClient,
    query: recordsQuery,
  });

  if (response.error) {
    throw new Error(formatApiError(response.error));
  }

  return response.data.data;
}

interface RecordsContentProps {
  pgcInvalid: boolean;
  data: GetRecordsResponse | null;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onLocate: (ra: number, dec: number) => void;
  onPageChange: (page: number) => void;
}

function RecordsContent({
  pgcInvalid,
  data,
  loading,
  error,
  page,
  pageSize,
  onLocate,
  onPageChange,
}: RecordsContentProps): ReactElement {
  if (pgcInvalid) {
    return <ErrorPage title="Error" message="PGC must be an integer." />;
  }
  if (error && !data) {
    return <ErrorPage title="Error" message={error} />;
  }
  if (!data && loading) {
    return <Loading />;
  }
  if (!data) {
    return <ErrorPage title="Error" message="No records" />;
  }

  return (
    <>
      <CommonTable
        columns={columns}
        data={recordRows(data.records, onLocate)}
        loading={loading}
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        records={data.records}
        handlePageChange={onPageChange}
      />
    </>
  );
}

export function RecordsPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();
  const skyViewerRef = useRef<SkyViewerHandle>(null);

  const tableName = searchParams.get("table_name")?.trim() ?? "";
  const recordId = searchParams.get("record_id")?.trim() ?? "";
  const pgcParam = searchParams.get("pgc");
  const pgc = parsePgc(pgcParam);
  const pgcInvalid = Boolean(pgcParam?.trim()) && pgc === null;
  const uploadStatus =
    pgc === null ? parseUploadStatus(searchParams.get("upload_status")) : null;
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("page_size"));

  const query: RecordsQuery | null = pgcInvalid
    ? null
    : {
        tableName: tableName || null,
        page,
        pageSize,
        pgc,
        recordId: recordId || null,
        uploadStatus,
      };

  useEffect(() => {
    document.title = tableName
      ? `Records - ${tableName} | LEDA`
      : "Records | LEDA";
  }, [tableName]);

  const { data, loading, error } = useDataFetching(
    () => fetchRecords(query),
    [query],
  );

  function handlePageChange(newPage: number): void {
    const next = new URLSearchParams(searchParams);
    next.set("page", newPage.toString());
    setSearchParams(next);
  }

  function handleApplyFilters(filters: AppliedFilters): void {
    const next = new URLSearchParams();
    const nextTableName = filters.tableName.trim();
    const nextRecordId = filters.recordId.trim();
    const nextPgc = filters.pgc.trim();

    if (nextTableName) {
      next.set("table_name", nextTableName);
    }
    if (nextRecordId) {
      next.set("record_id", nextRecordId);
    }
    if (nextPgc) {
      next.set("pgc", nextPgc);
    } else if (filters.uploadStatus !== "all") {
      next.set("upload_status", filters.uploadStatus);
    }
    next.set("page_size", filters.pageSize.toString());
    next.set("page", "0");
    setSearchParams(next);
  }

  const uploadStatusValue = searchParams.get("upload_status") ?? "all";
  const skySources = recordSkySources(data?.records ?? []);
  const skyView = skyViewForSources(skySources);

  function handleLocate(ra: number, dec: number): void {
    skyViewerRef.current?.locate(ra, dec, MIN_ALADIN_FOV_DEG);
  }

  return (
    <>
      <h2 className="text-3xl font-bold mb-4">Records</h2>
      <RecordsFilters
        tableName={tableName}
        pgc={pgcParam ?? ""}
        recordId={recordId}
        uploadStatus={
          parseUploadStatus(uploadStatusValue) ? uploadStatusValue : "all"
        }
        pageSize={pageSize}
        onApply={handleApplyFilters}
      />
      {skyView ? (
        <div className="mb-4">
          <SkyViewer
            ref={skyViewerRef}
            backend="wwt"
            ra={skyView.ra}
            dec={skyView.dec}
            fov={skyView.fov}
            className="w-full h-96"
            additionalSources={skySources}
          />
        </div>
      ) : null}
      <RecordsContent
        pgcInvalid={pgcInvalid}
        data={data}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        onLocate={handleLocate}
        onPageChange={handlePageChange}
      />
    </>
  );
}
