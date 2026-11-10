import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MdMyLocation } from "react-icons/md";
import { assignRecordPgcs, getRecords } from "../clients/admin";
import type {
  CrossmatchTriageStatus,
  GetRecordsData,
  GetRecordsResponse,
  Record as ApiRecord,
  UploadStatus,
} from "../clients/admin";
import { adminClient } from "../clients";
import { adminTableUrl, publicObjectUrl } from "../origins";
import { getResource } from "../resources";
import {
  Button,
  SkyViewer,
  CellPrimitive,
  Column,
  CommonTable,
  Declination,
  type TableAction,
  ErrorPage,
  Link,
  Loading,
  Pagination,
  RightAscension,
  type SkyViewerHandle,
} from "@leda/lib/ui";
import { Badge } from "../components/ui";
import {
  DropdownFilter,
  NumberFilter,
  PageSizeFilter,
  TextFilter,
} from "../components/ui/filters";
import { useDataFetching } from "@leda/lib/hooks";
import { formatApiError, formatCaughtError } from "@leda/lib/tap";

const UPLOAD_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "uploaded", label: "Uploaded" },
  { value: "pending", label: "Pending" },
];

const TRIAGE_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "unprocessed", label: "Unprocessed" },
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
  triageStatus: CrossmatchTriageStatus | null;
}

interface AppliedFilters {
  tableName: string;
  pgc: string;
  recordId: string;
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
  if (value === "pending" || value === "resolved" || value === "unprocessed") {
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

function isNumericCell(value: CellPrimitive): value is number {
  return Number.isFinite(value);
}

function getCandidatePgcs(record: ApiRecord): number[] {
  const fromCandidates = record.crossmatch.candidates
    .map((candidate) => candidate.pgc)
    .filter(
      (pgc): pgc is number => Number.isFinite(pgc) && Number.isInteger(pgc),
    );

  const recordPgc = record.pgc;
  if (
    recordPgc === null ||
    !Number.isFinite(recordPgc) ||
    !Number.isInteger(recordPgc)
  ) {
    return fromCandidates;
  }

  if (fromCandidates.includes(recordPgc)) {
    return fromCandidates;
  }

  return [recordPgc, ...fromCandidates];
}

function renderCandidates(record: ApiRecord): CellPrimitive {
  const pgcNumbers = getCandidatePgcs(record);
  if (pgcNumbers.length === 0) {
    return "—";
  }

  return (
    <>
      {pgcNumbers.map((pgc, index) => {
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

function getTriageStatusLabel(triageStatus: CrossmatchTriageStatus): string {
  const resourceKey =
    triageStatus === "unprocessed"
      ? "crossmatch.status.unprocessed"
      : `crossmatch.triage.${triageStatus}`;
  return getResource(resourceKey).Title;
}

const columns: Column[] = [
  { slug: "", width: "fit" },
  { slug: "Name" },
  { slug: "Table" },
  { slug: "PGC" },
  {
    slug: "RA",
    renderCell: (value) =>
      isNumericCell(value) ? <RightAscension value={value} /> : value,
  },
  {
    slug: "Dec",
    renderCell: (value) =>
      isNumericCell(value) ? <Declination value={value} /> : value,
  },
  { slug: "Redshift" },
  { slug: "Nature" },
  { slug: "Manual check status" },
  { slug: "Candidates" },
];

const FILTERABLE_COLUMNS = columns
  .map((column) => column.slug)
  .filter((slug) => slug !== "");
const defaultVisibleColumns = ["Name", "Table", "PGC", "Redshift", "Nature"];

function parseVisibleColumns(value: string | null): string[] {
  if (value === null || value.trim() === "") {
    return defaultVisibleColumns;
  }
  const known = new Set(FILTERABLE_COLUMNS);
  const parsed = value
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => known.has(slug));
  return parsed.length > 0 ? parsed : defaultVisibleColumns;
}

function isDefaultVisibleColumns(visible: string[]): boolean {
  if (visible.length !== defaultVisibleColumns.length) {
    return false;
  }
  const selected = new Set(visible);
  return defaultVisibleColumns.every((slug) => selected.has(slug));
}

function writeVisibleColumns(params: URLSearchParams, visible: string[]): void {
  if (isDefaultVisibleColumns(visible)) {
    params.delete("columns");
    return;
  }
  params.set(
    "columns",
    FILTERABLE_COLUMNS.filter((slug) => visible.includes(slug)).join(","),
  );
}

function recordRows(
  records: ApiRecord[],
  onLocate: (ra: number, dec: number) => void,
): Record<string, CellPrimitive>[] {
  return records.map((record) => ({
    __recordId: record.id,
    "": renderLocate(record, onLocate),
    Name: (
      <Link href={`/records/${record.id}`}>
        {record.catalogs.designation?.name || record.id}
      </Link>
    ),
    Table: record.table_name ? (
      <Link href={adminTableUrl(record.table_name).href}>
        {record.table_name}
      </Link>
    ) : (
      "—"
    ),
    PGC: renderPgc(record.pgc),
    RA: record.catalogs.icrs?.ra ?? "—",
    Dec: record.catalogs.icrs?.dec ?? "—",
    Redshift: formatCatalogNumber(record.catalogs.redshift?.z, 4),
    Nature: record.catalogs.nature?.type_name || "—",
    "Manual check status": getTriageStatusLabel(
      record.crossmatch.triage_status,
    ),
    Candidates: renderCandidates(record),
  }));
}

interface RecordsFiltersProps {
  tableName: string;
  pgc: string;
  recordId: string;
  uploadStatus: string;
  triageStatus: string;
  pageSize: number;
  onApply: (filters: AppliedFilters) => void;
}

function RecordsFilters({
  tableName,
  pgc,
  recordId,
  uploadStatus,
  triageStatus,
  pageSize,
  onApply,
}: RecordsFiltersProps): ReactElement {
  const [localTableName, setLocalTableName] = useState(tableName);
  const [localPgc, setLocalPgc] = useState(pgc);
  const [localRecordId, setLocalRecordId] = useState(recordId);
  const [localUploadStatus, setLocalUploadStatus] = useState(uploadStatus);
  const [localTriageStatus, setLocalTriageStatus] = useState(triageStatus);
  const [localPageSize, setLocalPageSize] = useState(pageSize);

  useEffect(() => {
    setLocalTableName(tableName);
    setLocalPgc(pgc);
    setLocalRecordId(recordId);
    setLocalUploadStatus(uploadStatus);
    setLocalTriageStatus(triageStatus);
    setLocalPageSize(pageSize);
  }, [tableName, pgc, recordId, uploadStatus, triageStatus, pageSize]);

  const pgcActive = localPgc.trim() !== "";
  const uploadDisabled = pgcActive;
  const effectiveUploadStatus = uploadDisabled ? "all" : localUploadStatus;
  const triageDisabled = pgcActive || effectiveUploadStatus === "uploaded";

  function applyFilters(): void {
    onApply({
      tableName: localTableName,
      pgc: localPgc,
      recordId: localRecordId,
      uploadStatus: effectiveUploadStatus,
      triageStatus: triageDisabled ? "all" : localTriageStatus,
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
        value={effectiveUploadStatus}
        onChange={setLocalUploadStatus}
        disabled={uploadDisabled}
        defaultValue="all"
      />
      <DropdownFilter
        title="Manual check status"
        options={TRIAGE_STATUS_OPTIONS}
        value={triageDisabled ? "all" : localTriageStatus}
        onChange={setLocalTriageStatus}
        disabled={triageDisabled}
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

interface AssignPgcDialogProps {
  recordIds: string[];
  onClose: () => void;
  onAssigned: () => void;
}

function AssignPgcDialog({
  recordIds,
  onClose,
  onAssigned,
}: AssignPgcDialogProps): ReactElement {
  const [pgcText, setPgcText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(): Promise<void> {
    const pgc = parsePgc(pgcText);
    if (pgc === null) {
      setError("PGC must be an integer.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await assignRecordPgcs({
        client: adminClient,
        body: {
          assignments: recordIds.map((recordId) => ({
            record_id: recordId,
            pgc,
          })),
        },
      });
      if (response.error) {
        throw new Error(formatApiError(response.error));
      }
      onAssigned();
    } catch (submitError) {
      setError(formatCaughtError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-app/60 p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-pgc-title"
        className="w-full max-w-sm rounded-lg border border-border bg-surface-2 p-4"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h3 id="assign-pgc-title" className="mb-3 text-lg font-semibold">
          Assign PGC
        </h3>
        <label htmlFor="assign-pgc" className="mb-1 block text-sm text-subtle">
          PGC
        </label>
        <input
          id="assign-pgc"
          type="number"
          required
          autoFocus
          value={pgcText}
          disabled={submitting}
          onChange={(event) => setPgcText(event.target.value)}
          className="w-full rounded border border-border bg-surface px-3 py-2 text-primary"
        />
        {error ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface RecordsContentProps {
  pgcInvalid: boolean;
  data: GetRecordsResponse | null;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  visibleColumns: string[];
  actions: TableAction[];
  onLocate: (ra: number, dec: number) => void;
  onPageChange: (page: number) => void;
  onVisibleColumnsChange: (visibleColumns: string[]) => void;
}

function RecordsContent({
  pgcInvalid,
  data,
  loading,
  error,
  page,
  pageSize,
  visibleColumns,
  actions,
  onLocate,
  onPageChange,
  onVisibleColumnsChange,
}: RecordsContentProps): ReactElement {
  const onLocateRef = useRef(onLocate);
  onLocateRef.current = onLocate;
  const rows = useMemo(
    () =>
      data
        ? recordRows(data.records, (ra, dec) => {
            onLocateRef.current(ra, dec);
          })
        : [],
    [data],
  );

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
        data={rows}
        loading={loading}
        columnFilter
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={onVisibleColumnsChange}
        actions={actions}
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
  const [assignRecordIds, setAssignRecordIds] = useState<string[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const tableName = searchParams.get("table_name")?.trim() ?? "";
  const recordId = searchParams.get("record_id")?.trim() ?? "";
  const pgcParam = searchParams.get("pgc");
  const pgc = parsePgc(pgcParam);
  const pgcInvalid = Boolean(pgcParam?.trim()) && pgc === null;
  const uploadStatus =
    pgc === null ? parseUploadStatus(searchParams.get("upload_status")) : null;
  const triageStatus =
    pgc === null && uploadStatus !== "uploaded"
      ? parseTriageStatus(searchParams.get("triage_status"))
      : null;
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("page_size"));
  const visibleColumns = parseVisibleColumns(searchParams.get("columns"));

  const query: RecordsQuery | null = pgcInvalid
    ? null
    : {
        tableName: tableName || null,
        page,
        pageSize,
        pgc,
        recordId: recordId || null,
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
    [query, refreshKey],
  );

  const tableActions: TableAction[] = [
    {
      label: "Assign PGC",
      onAction: (rows) => {
        const recordIds = rows.flatMap((row) => {
          if (!row.__recordId) {
            return [];
          }
          // SAFETY: recordRows stores the API record id string on __recordId.
          const recordId = row.__recordId as string;
          return [recordId];
        });
        if (recordIds.length === 0) {
          return;
        }
        setAssignRecordIds(recordIds);
      },
    },
  ];

  function handlePageChange(newPage: number): void {
    const next = new URLSearchParams(searchParams);
    next.set("page", newPage.toString());
    setSearchParams(next);
  }

  function handleVisibleColumnsChange(nextVisible: string[]): void {
    const next = new URLSearchParams(searchParams);
    writeVisibleColumns(next, nextVisible);
    setSearchParams(next, { replace: true });
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
    } else {
      if (filters.uploadStatus !== "all") {
        next.set("upload_status", filters.uploadStatus);
      }
      if (
        filters.triageStatus !== "all" &&
        filters.uploadStatus !== "uploaded"
      ) {
        next.set("triage_status", filters.triageStatus);
      }
    }
    next.set("page_size", filters.pageSize.toString());
    next.set("page", "0");
    writeVisibleColumns(next, visibleColumns);
    setSearchParams(next);
  }

  const uploadStatusValue = searchParams.get("upload_status") ?? "all";
  const triageStatusValue = searchParams.get("triage_status") ?? "all";
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
        triageStatus={
          parseTriageStatus(triageStatusValue) ? triageStatusValue : "all"
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
        visibleColumns={visibleColumns}
        actions={tableActions}
        onLocate={handleLocate}
        onPageChange={handlePageChange}
        onVisibleColumnsChange={handleVisibleColumnsChange}
      />
      {assignRecordIds ? (
        <AssignPgcDialog
          recordIds={assignRecordIds}
          onClose={() => setAssignRecordIds(null)}
          onAssigned={() => {
            setAssignRecordIds(null);
            setRefreshKey((current) => current + 1);
          }}
        />
      ) : null}
    </>
  );
}
