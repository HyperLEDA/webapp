import { ReactElement, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getRecords } from "../clients/admin";
import type {
  CrossmatchTriageStatus,
  GetRecordsData,
  GetRecordsResponse,
  Record as ApiRecord,
  UploadStatus,
} from "../clients/admin";
import { adminClient } from "../clients";
import { getResource } from "../resources";
import { adminTableUrl, publicObjectUrl } from "../origins";
import {
  AladinViewer,
  Button,
  CellPrimitive,
  Column,
  CommonTable,
  ErrorPage,
  Link,
  Loading,
  Pagination,
} from "@leda/lib/ui";
import {
  Badge,
  DropdownFilter,
  PageSizeFilter,
  TextFilter,
} from "../components/ui";
import { useDataFetching } from "@leda/lib/hooks";
import { formatApiError } from "@leda/lib/tap";

const UPLOAD_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "uploaded", label: "Uploaded" },
  { value: "pending", label: "Pending" },
];

const TRIAGE_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unprocessed", label: "Unprocessed" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
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
  uploadStatus: UploadStatus | null;
  triageStatus: CrossmatchTriageStatus | null;
}

interface AppliedFilters {
  tableName: string;
  pgc: string;
  uploadStatus: string;
  triageStatus: string;
  pageSize: number;
}

function parseUploadStatus(value: string | null): UploadStatus | null {
  if (value === "uploaded" || value === "pending") {
    return value;
  }
  return null;
}

function parseTriageStatus(
  value: string | null,
): CrossmatchTriageStatus | null {
  if (value === "unprocessed" || value === "pending" || value === "resolved") {
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

function triageStatusLabel(status: CrossmatchTriageStatus): string {
  const resourceKey =
    status === "unprocessed"
      ? "crossmatch.status.unprocessed"
      : `crossmatch.triage.${status}`;
  return getResource(resourceKey).Title;
}

function candidatePgcs(record: ApiRecord): number[] {
  const fromCandidates = record.crossmatch.candidates
    .map((candidate) => candidate.pgc)
    .filter((pgc): pgc is number => Number.isInteger(pgc));

  const recordPgc = record.pgc;
  if (recordPgc === null || !Number.isInteger(recordPgc)) {
    return fromCandidates;
  }
  if (fromCandidates.includes(recordPgc)) {
    return fromCandidates;
  }
  return [recordPgc, ...fromCandidates];
}

function renderPgc(pgc: number | null): CellPrimitive {
  if (pgc === null) {
    return "—";
  }
  const objectLink = publicObjectUrl(pgc);
  return (
    <Link href={objectLink.href} external={objectLink.external}>
      {pgc}
    </Link>
  );
}

function renderCandidates(record: ApiRecord): CellPrimitive {
  const pgcs = candidatePgcs(record);
  if (pgcs.length === 0) {
    return "—";
  }
  return (
    <>
      {pgcs.map((pgc, index) => {
        const objectLink = publicObjectUrl(pgc);
        return (
          <Badge
            key={`${pgc}-${index}`}
            href={objectLink.href}
            external={objectLink.external}
          >
            {pgc}
          </Badge>
        );
      })}
    </>
  );
}

const columns: Column[] = [
  { slug: "Name" },
  { slug: "Table" },
  { slug: "PGC" },
  { slug: "RA" },
  { slug: "Dec" },
  { slug: "Redshift" },
  { slug: "Nature" },
  { slug: "Manual check status" },
  { slug: "Candidates" },
];

function recordRows(records: ApiRecord[]): Record<string, CellPrimitive>[] {
  return records.map((record) => ({
    Name: record.catalogs.designation?.name || record.id,
    Table: record.table_name ? (
      <Link href={adminTableUrl(record.table_name).href}>
        {record.table_name}
      </Link>
    ) : (
      "—"
    ),
    PGC: renderPgc(record.pgc),
    RA: formatCatalogNumber(record.catalogs.icrs?.ra, 6),
    Dec: formatCatalogNumber(record.catalogs.icrs?.dec, 6),
    Redshift: formatCatalogNumber(record.catalogs.redshift?.z, 4),
    Nature: record.catalogs.nature?.type_name || "—",
    "Manual check status": triageStatusLabel(record.crossmatch.triage_status),
    Candidates: renderCandidates(record),
  }));
}

interface RecordsFiltersProps {
  tableName: string;
  pgc: string;
  uploadStatus: string;
  triageStatus: string;
  pageSize: number;
  onApply: (filters: AppliedFilters) => void;
}

function RecordsFilters({
  tableName,
  pgc,
  uploadStatus,
  triageStatus,
  pageSize,
  onApply,
}: RecordsFiltersProps): ReactElement {
  const [localTableName, setLocalTableName] = useState(tableName);
  const [localPgc, setLocalPgc] = useState(pgc);
  const [localUploadStatus, setLocalUploadStatus] = useState(uploadStatus);
  const [localTriageStatus, setLocalTriageStatus] = useState(triageStatus);
  const [localPageSize, setLocalPageSize] = useState(pageSize);

  useEffect(() => {
    setLocalTableName(tableName);
    setLocalPgc(pgc);
    setLocalUploadStatus(uploadStatus);
    setLocalTriageStatus(triageStatus);
    setLocalPageSize(pageSize);
  }, [tableName, pgc, uploadStatus, triageStatus, pageSize]);

  const pgcActive = localPgc.trim() !== "";
  const uploadDisabled = pgcActive;
  const triageDisabled = pgcActive || localUploadStatus === "uploaded";

  function applyFilters(): void {
    onApply({
      tableName: localTableName,
      pgc: localPgc,
      uploadStatus: uploadDisabled ? "all" : localUploadStatus,
      triageStatus: triageDisabled ? "all" : localTriageStatus,
      pageSize: localPageSize,
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-4 mb-4">
      <TextFilter
        title="Table name"
        value={localTableName}
        onChange={setLocalTableName}
        placeholder="All tables"
        onEnter={applyFilters}
      />
      <TextFilter
        title="PGC"
        value={localPgc}
        onChange={setLocalPgc}
        placeholder="Exact PGC"
        onEnter={applyFilters}
      />
      <DropdownFilter
        title="Upload status"
        options={UPLOAD_STATUS_OPTIONS}
        value={uploadDisabled ? "all" : localUploadStatus}
        onChange={setLocalUploadStatus}
        disabled={uploadDisabled}
      />
      <DropdownFilter
        title="Manual check status"
        options={TRIAGE_STATUS_OPTIONS}
        value={triageDisabled ? "all" : localTriageStatus}
        onChange={setLocalTriageStatus}
        disabled={triageDisabled}
      />
      <PageSizeFilter
        pageSize={localPageSize}
        onPageSizeChange={setLocalPageSize}
      />
      <div className="flex items-end">
        <Button onClick={applyFilters}>Apply</Button>
      </div>
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
    upload_status: query.uploadStatus,
    triage_status: query.triageStatus,
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
  onPageChange: (page: number) => void;
}

function RecordsContent({
  pgcInvalid,
  data,
  loading,
  error,
  page,
  pageSize,
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
        data={recordRows(data.records)}
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

  const tableName = searchParams.get("table_name")?.trim() ?? "";
  const pgcParam = searchParams.get("pgc");
  const pgc = parsePgc(pgcParam);
  const pgcInvalid = Boolean(pgcParam?.trim()) && pgc === null;
  const uploadStatus =
    pgc === null ? parseUploadStatus(searchParams.get("upload_status")) : null;
  const triageStatus =
    pgc !== null || uploadStatus === "uploaded"
      ? null
      : parseTriageStatus(searchParams.get("triage_status"));
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("page_size"));

  const query: RecordsQuery | null = pgcInvalid
    ? null
    : {
        tableName: tableName || null,
        page,
        pageSize,
        pgc,
        uploadStatus,
        triageStatus,
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
    const nextPgc = filters.pgc.trim();

    if (nextTableName) {
      next.set("table_name", nextTableName);
    }
    if (nextPgc) {
      next.set("pgc", nextPgc);
    } else {
      if (filters.uploadStatus !== "all") {
        next.set("upload_status", filters.uploadStatus);
      }
      if (
        filters.uploadStatus !== "uploaded" &&
        filters.triageStatus !== "all"
      ) {
        next.set("triage_status", filters.triageStatus);
      }
    }
    next.set("page_size", filters.pageSize.toString());
    next.set("page", "0");
    setSearchParams(next);
  }

  const uploadStatusValue = searchParams.get("upload_status") ?? "all";
  const triageStatusValue = searchParams.get("triage_status") ?? "all";
  const skySources = recordSkySources(data?.records ?? []);
  const skyView = skyViewForSources(skySources);

  return (
    <>
      <h2 className="text-3xl font-bold mb-4">Records</h2>
      <RecordsFilters
        tableName={tableName}
        pgc={pgcParam ?? ""}
        uploadStatus={
          parseUploadStatus(uploadStatusValue) ? uploadStatusValue : "all"
        }
        triageStatus={
          parseTriageStatus(triageStatusValue) ? triageStatusValue : "all"
        }
        pageSize={pageSize}
        onApply={handleApplyFilters}
      />
      {skyView ? (
        <AladinViewer
          ra={skyView.ra}
          dec={skyView.dec}
          fov={skyView.fov}
          className="w-full h-96 mb-4"
          additionalSources={skySources}
        />
      ) : null}
      <RecordsContent
        pgcInvalid={pgcInvalid}
        data={data}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </>
  );
}
