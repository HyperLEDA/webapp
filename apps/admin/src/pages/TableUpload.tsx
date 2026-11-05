import { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { MdKeyboardArrowDown, MdUpload } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { Button, CommonTable, Loading, SuggestibleInput } from "@leda/lib/ui";
import { formatApiError, formatCaughtError } from "@leda/lib/tap";

import {
  DataType,
  listReferenceRows,
  type ReferenceRowItem,
} from "../clients/admin";
import { adminClient } from "../clients";
import { formatReferenceValue } from "../components/ui/referenceValues";
import { CsvConfigFields } from "../upload/csv/ConfigFields";
import { inferColumns } from "../upload/csv/infer";
import type { CsvConfig } from "../upload/csv/parser";
import { FitsConfigFields } from "../upload/fits/ConfigFields";
import type { FitsConfig } from "../upload/fits/parser";
import {
  CSV_FILE_TYPE,
  FILE_TYPES,
  FITS_FILE_TYPE,
  matchFileType,
  tableNameFromFilename,
  type FileTypeId,
} from "../upload/registry";
import { PREVIEW_ROW_LIMIT, uploadTable } from "../upload/upload";
import type { ParseResult } from "../upload/types";

const SEARCH_DEBOUNCE_MS = 300;
const controlClassName =
  "bg-surface-2 border border-border rounded px-2 py-1 text-primary w-full min-w-0 text-sm";
const selectClassName =
  "bg-surface-2 border border-border rounded pl-2 pr-8 py-1 text-primary w-full min-w-0 text-sm appearance-none";

const BIBCODE_PATTERN =
  /^([0-9]{4}[A-Za-z.&]{5}[A-Za-z0-9.]{4}[AELPQ-Z0-9.][0-9.]{4}[A-Z])$/;

const TABLE_TYPES: { value: DataType; label: string }[] = [
  { value: "regular", label: "Regular" },
  { value: "compilation", label: "Compilation" },
];

const FILE_ACCEPT = FILE_TYPES.flatMap((type) => type.extensions).join(",");

interface BibSuggestion {
  code: string;
  title: string;
}

function bibSuggestion(item: ReferenceRowItem): BibSuggestion | null {
  const code =
    formatReferenceValue(item.row.code).trim() ||
    formatReferenceValue(item.key.code).trim();
  if (!code) {
    return null;
  }
  return { code, title: formatReferenceValue(item.row.title).trim() };
}

function selectTableType(value: string): DataType | null {
  const match = TABLE_TYPES.find((type) => type.value === value);
  return match ? match.value : null;
}

function BibcodeInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): ReactElement {
  const [suggestions, setSuggestions] = useState<BibSuggestion[]>([]);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  async function load(query: string): Promise<void> {
    const id = requestId.current + 1;
    requestId.current = id;
    try {
      const response = await listReferenceRows({
        client: adminClient,
        path: { schema: "common", table: "bib" },
        query: {
          query: query.trim() || undefined,
          page: 0,
          page_size: 20,
        },
      });
      if (id !== requestId.current) {
        return;
      }
      if (response.error) {
        throw new Error(formatApiError(response.error));
      }
      setSuggestions(
        response.data.data.items.flatMap((item) => {
          const suggestion = bibSuggestion(item);
          return suggestion ? [suggestion] : [];
        }),
      );
    } catch {
      if (id === requestId.current) {
        setSuggestions([]);
      }
    }
  }

  function schedule(query: string): void {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      void load(query);
    }, SEARCH_DEBOUNCE_MS);
  }

  function suggestionNodes(): ReactNode[] {
    return suggestions.map((item) => (
      <button
        key={item.code}
        type="button"
        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onChange(item.code)}
      >
        <div>{item.code}</div>
        {item.title ? (
          <div className="text-xs text-muted">{item.title}</div>
        ) : null}
      </button>
    ));
  }

  return (
    <SuggestibleInput
      value={value}
      disabled={disabled}
      placeholder="Select or enter bibcode…"
      onChange={(next) => {
        onChange(next);
        schedule(next);
      }}
      onFocus={() => {
        void load(value);
      }}
      getSuggestions={suggestionNodes}
    />
  );
}

export function TableUploadPage(): ReactElement {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileTypeId, setFileTypeId] = useState<FileTypeId | "">("");
  const [csvConfig, setCsvConfig] = useState<CsvConfig>({
    separator: ",",
    skipLines: 0,
  });
  const [fitsConfig, setFitsConfig] = useState<FitsConfig>({ hduIndex: 1 });
  const [tableName, setTableName] = useState("");
  const [tableType, setTableType] = useState<DataType>("regular");
  const [description, setDescription] = useState("");
  const [bibcode, setBibcode] = useState("");
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasFile = file !== null;
  const typeReady =
    fileTypeId === "csv" ? csvConfig.separator !== "" : fileTypeId === "fits";
  const bibcodeValue = bibcode.trim();
  const bibcodeError =
    bibcodeValue !== "" && !BIBCODE_PATTERN.test(bibcodeValue)
      ? "Invalid bibcode"
      : null;
  const canSubmit =
    hasFile &&
    typeReady &&
    tableName.trim() !== "" &&
    description.trim() !== "" &&
    bibcodeValue !== "" &&
    bibcodeError === null &&
    preview !== null &&
    !parsing &&
    !uploading &&
    parseError === null;

  useEffect(() => {
    document.title = "Upload table | LEDA";
  }, []);

  useEffect(() => {
    if (!file || fileTypeId === "") {
      setPreview(null);
      setParsing(false);
      setParseError(null);
      return;
    }

    if (fileTypeId === "csv" && csvConfig.separator === "") {
      setPreview(null);
      setParsing(false);
      setParseError("Separator is empty");
      return;
    }

    let cancelled = false;
    setParsing(true);
    setParseError(null);

    const pending =
      fileTypeId === "csv"
        ? CSV_FILE_TYPE.parse(file, csvConfig, { truncate: PREVIEW_ROW_LIMIT })
        : FITS_FILE_TYPE.parse(file, fitsConfig, {
            truncate: PREVIEW_ROW_LIMIT,
          });

    void pending
      .then((result) => {
        if (cancelled) {
          return;
        }
        setPreview(result);
      })
      .catch((cause: unknown) => {
        if (cancelled) {
          return;
        }
        setPreview(null);
        setParseError(formatCaughtError(cause));
      })
      .finally(() => {
        if (!cancelled) {
          setParsing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file, fileTypeId, csvConfig, fitsConfig]);

  function chooseFile(next: File): void {
    const matched = matchFileType(next.name);
    setFile(next);
    setFileTypeId(matched?.id ?? "");
    if (matched?.id === "csv") {
      setCsvConfig(matched.defaultConfig(next.name));
    }
    if (matched?.id === "fits") {
      setFitsConfig(matched.defaultConfig(next.name));
    }
    setTableName(tableNameFromFilename(next.name));
    setError(null);
    setProgress(null);
  }

  function clearFile(): void {
    setFile(null);
    setFileTypeId("");
    setPreview(null);
    setParseError(null);
    setError(null);
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function selectFileType(next: string): void {
    if (!file) {
      setFileTypeId("");
      return;
    }
    const matched = FILE_TYPES.find((type) => type.id === next);
    if (!matched) {
      setFileTypeId("");
      return;
    }
    setFileTypeId(matched.id);
    if (matched.id === "csv") {
      setCsvConfig(matched.defaultConfig(file.name));
      return;
    }
    setFitsConfig(matched.defaultConfig(file.name));
  }

  async function submit(): Promise<void> {
    if (!file || fileTypeId === "" || !canSubmit) {
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(null);

    try {
      const parsed =
        fileTypeId === "csv"
          ? await CSV_FILE_TYPE.parse(file, csvConfig)
          : await FITS_FILE_TYPE.parse(file, fitsConfig);
      const columns =
        parsed.columnDescriptions ?? inferColumns(parsed.columns, parsed.rows);
      await uploadTable({
        tableName: tableName.trim(),
        description: description.trim(),
        bibcode: bibcode.trim(),
        datatype: tableType,
        columns,
        rows: parsed.rows,
        onProgress: (completed, total) => {
          setProgress(`Uploading batch ${completed} of ${total}`);
        },
      });
      void navigate(`/table/${encodeURIComponent(tableName.trim())}`);
    } catch (cause) {
      setError(formatCaughtError(cause));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button type="button" onClick={() => void navigate("/tables")}>
          Back
        </Button>
        <div className="flex-1" />
        <Button disabled={!canSubmit} onClick={() => void submit()}>
          {uploading ? "Saving…" : "Save"}
        </Button>
      </div>

      {progress ? <p className="text-sm text-muted mb-3">{progress}</p> : null}
      {error ? (
        <p className="text-sm text-danger mb-3" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <section className="rounded-lg border border-border bg-surface p-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-muted">File</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                hoverText="Choose file"
                className="w-8 h-8 p-0 justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <MdUpload className="w-5 h-5" />
              </Button>
              {file ? (
                <Button type="button" transparent onClick={clearFile}>
                  Clear
                </Button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next) {
                    chooseFile(next);
                  }
                }}
              />
            </div>
            {file ? <span className="text-sm">{file.name}</span> : null}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-muted">File type</span>
            <div className="relative">
              <select
                className={selectClassName}
                value={fileTypeId}
                disabled={!hasFile}
                onChange={(event) => selectFileType(event.target.value)}
              >
                <option value="">Unknown</option>
                {FILE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <MdKeyboardArrowDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            </div>
          </label>

          {fileTypeId === "csv" ? (
            <CsvConfigFields
              config={csvConfig}
              disabled={!hasFile || uploading}
              onChange={setCsvConfig}
            />
          ) : null}
          {fileTypeId === "fits" ? (
            <FitsConfigFields
              config={fitsConfig}
              disabled={!hasFile || uploading}
              onChange={setFitsConfig}
            />
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-surface p-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-semibold text-muted">
                Table name
              </span>
              <input
                className={controlClassName}
                value={tableName}
                disabled={!hasFile || uploading}
                placeholder="sdss_dr12"
                onChange={(event) => setTableName(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-semibold text-muted">
                Table type
              </span>
              <div className="relative">
                <select
                  className={selectClassName}
                  value={tableType}
                  disabled={!hasFile || uploading}
                  onChange={(event) => {
                    const next = selectTableType(event.target.value);
                    if (next) {
                      setTableType(next);
                    }
                  }}
                >
                  {TABLE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <MdKeyboardArrowDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              </div>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-muted">
              Description
            </span>
            <textarea
              className={controlClassName}
              rows={3}
              value={description}
              disabled={!hasFile || uploading}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-muted">Bibcode</span>
            <BibcodeInput
              value={bibcode}
              disabled={!hasFile || uploading}
              onChange={setBibcode}
            />
            {bibcodeError ? (
              <p className="text-sm text-danger" role="alert">
                {bibcodeError}
              </p>
            ) : null}
          </label>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-surface p-3 overflow-auto">
        {parsing ? <Loading /> : null}
        {!parsing && parseError ? (
          <p className="text-sm text-danger" role="alert">
            {parseError}
          </p>
        ) : null}
        {!parsing && !parseError && preview ? (
          <CommonTable
            columns={preview.columns.map((column) => ({
              slug: column,
              label: column,
            }))}
            data={preview.rows}
          />
        ) : null}
        {!parsing && !parseError && !preview ? (
          <p className="text-sm text-muted">No preview</p>
        ) : null}
      </section>
    </>
  );
}
