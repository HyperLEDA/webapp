import { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { mergePgcs } from "../clients/admin";
import { querySimple } from "@hyperleda/lib/clients/backend";
import { PgcObject, Schema } from "@hyperleda/lib/clients/backend";
import { adminClient } from "../clients";
import { backendClient } from "@hyperleda/lib/clients";
import { describeUnknownError } from "@hyperleda/lib/tap";
import { publicObjectUrl } from "../origins";
import {
  AladinViewer,
  Button,
  Link,
  SuggestibleInput,
} from "@hyperleda/lib/ui";
import { ObjectSummary } from "../components/ui";

const MIN_ALADIN_FOV_DEG = 0.05;
const ALADIN_FOV_PADDING = 1.4;
const SEARCH_DEBOUNCE_MS = 300;
const NAME_SUGGESTION_LIMIT = 5;

type SkySource = {
  ra: number;
  dec: number;
  label: string;
  id: number;
};

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

function objectLabel(object: PgcObject): string {
  return object.catalogs.designation?.name || `PGC ${object.pgc}`;
}

function objectToSkySource(object: PgcObject, role: string): SkySource | null {
  const equatorial = object.catalogs.coordinates?.equatorial;
  if (equatorial?.ra === undefined || equatorial?.dec === undefined) {
    return null;
  }

  return {
    ra: equatorial.ra,
    dec: equatorial.dec,
    label: `${objectLabel(object)} (${role})`,
    id: object.pgc,
  };
}

function isPgcNumberInput(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

async function fetchPgc(
  pgc: number,
): Promise<{ object: PgcObject; schema: Schema }> {
  const response = await querySimple({
    client: backendClient,
    query: {
      pgcs: [pgc],
    },
  });

  if (response.error || !response.data) {
    const err = response.error;
    throw new Error(`Error during query: ${describeUnknownError(err)}`);
  }

  const objects = response.data.data.objects;
  const schema = response.data.data.schema;
  const object = objects?.[0];

  if (!object || Object.keys(object.catalogs).length === 0) {
    throw new Error(`Object PGC ${pgc} not found`);
  }

  return { object, schema };
}

async function fetchByName(
  name: string,
  pageSize: number,
): Promise<{ objects: PgcObject[]; schema: Schema }> {
  const response = await querySimple({
    client: backendClient,
    query: {
      name,
      page: 0,
      page_size: pageSize,
    },
  });

  if (response.error || !response.data) {
    const err = response.error;
    throw new Error(`Error during query: ${describeUnknownError(err)}`);
  }

  return {
    objects: response.data.data.objects,
    schema: response.data.data.schema,
  };
}

interface PgcSelection {
  object: PgcObject;
  schema: Schema;
}

interface PgcPickerProps {
  label: string;
  selection: PgcSelection | null;
  onSelect: (selection: PgcSelection | null) => void;
  disabled?: boolean;
}

function ObjectNameLink({
  pgc,
  label,
}: {
  pgc: number;
  label: string;
}): ReactElement {
  const objectLink = publicObjectUrl(pgc);
  return (
    <Link href={objectLink.href} external={objectLink.external}>
      {label}
    </Link>
  );
}

function PgcPicker({
  label,
  selection,
  onSelect,
  disabled,
}: PgcPickerProps): ReactElement {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameResults, setNameResults] = useState<PgcSelection[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      requestIdRef.current += 1;
    },
    [],
  );

  function selectResult(result: PgcSelection): void {
    onSelect(result);
    setQuery("");
    setNameResults([]);
    setError(null);
  }

  async function runSearch(raw: string): Promise<void> {
    const trimmed = raw.trim();
    if (!trimmed) {
      setNameResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      if (isPgcNumberInput(trimmed)) {
        setNameResults([]);
        const pgc = Number.parseInt(trimmed, 10);
        if (pgc <= 0) {
          throw new Error("Enter a valid PGC number");
        }
        const result = await fetchPgc(pgc);
        if (requestId !== requestIdRef.current) {
          return;
        }
        onSelect(result);
        setError(null);
      } else {
        const { objects, schema } = await fetchByName(
          trimmed,
          NAME_SUGGESTION_LIMIT,
        );
        if (requestId !== requestIdRef.current) {
          return;
        }
        const next = objects
          .filter((object) => Object.keys(object.catalogs).length > 0)
          .slice(0, NAME_SUGGESTION_LIMIT)
          .map((object) => ({ object, schema }));
        setNameResults(next);
        if (next.length === 0) {
          setError(`No objects found for "${trimmed}"`);
        }
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setNameResults([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }

  function scheduleSearch(value: string): void {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleQueryChange(value: string): void {
    setQuery(value);
    setError(null);
    setNameResults([]);
    scheduleSearch(value);
  }

  function clearSelection(): void {
    requestIdRef.current += 1;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onSelect(null);
    setError(null);
    setQuery("");
    setNameResults([]);
    setLoading(false);
  }

  function getSuggestions(value: string): ReactNode[] {
    if (!value.trim()) {
      return [];
    }
    if (loading) {
      return [
        <div
          key="loading"
          className="flex items-center justify-center px-3 py-4"
        >
          <div
            className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin"
            aria-label="Loading"
          />
        </div>,
      ];
    }
    if (isPgcNumberInput(value)) {
      return [];
    }
    return nameResults.map((suggestion) => (
      <button
        key={suggestion.object.pgc}
        type="button"
        disabled={disabled}
        className="w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => selectResult(suggestion)}
      >
        <span className="font-medium">{objectLabel(suggestion.object)}</span>
        <span className="text-muted ml-2">PGC {suggestion.object.pgc}</span>
      </button>
    ));
  }

  return (
    <div className="flex flex-col gap-3 min-w-0 flex-1">
      <h2 className="text-lg font-semibold">{label}</h2>
      <SuggestibleInput
        value={query}
        onChange={handleQueryChange}
        getSuggestions={getSuggestions}
        placeholder="PGC number or name"
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (debounceRef.current) {
              clearTimeout(debounceRef.current);
              debounceRef.current = null;
            }
            if (nameResults.length > 0) {
              selectResult(nameResults[0]);
              return;
            }
            void runSearch(query);
          }
          if (event.key === "Escape") {
            setNameResults([]);
          }
        }}
      />
      {error ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {selection ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-sm font-semibold">
              PGC {selection.object.pgc}
            </span>
            <Button
              type="button"
              disabled={disabled || loading}
              onClick={clearSelection}
              className="!px-2 !py-1 text-sm"
            >
              Clear
            </Button>
          </div>
          <ObjectSummary
            catalogs={selection.object.catalogs}
            schema={selection.schema}
            name={
              <ObjectNameLink
                pgc={selection.object.pgc}
                label={objectLabel(selection.object)}
              />
            }
          />
        </div>
      ) : null}
    </div>
  );
}

export function AdminMergePgcPage(): ReactElement {
  const [target, setTarget] = useState<PgcSelection | null>(null);
  const [source, setSource] = useState<PgcSelection | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Merge PGC objects | HyperLEDA";
  }, []);

  const samePgc =
    target !== null &&
    source !== null &&
    target.object.pgc === source.object.pgc;
  const canMerge = target !== null && source !== null && !samePgc && !merging;

  const skySources: SkySource[] = [];
  if (target) {
    const sky = objectToSkySource(target.object, "target");
    if (sky) {
      skySources.push(sky);
    }
  }
  if (source) {
    const sky = objectToSkySource(source.object, "source");
    if (sky) {
      skySources.push(sky);
    }
  }

  const skyView =
    target && source && skySources.length > 0
      ? skyViewForSources(skySources)
      : null;

  async function handleMerge(): Promise<void> {
    if (!target || !source || target.object.pgc === source.object.pgc) {
      return;
    }

    setMerging(true);
    setMergeError(null);
    setMergeSuccess(null);

    try {
      const response = await mergePgcs({
        client: adminClient,
        body: {
          target_pgc: target.object.pgc,
          source_pgcs: [source.object.pgc],
        },
      });

      if (response.error || !response.data?.data) {
        throw new Error(
          describeUnknownError(response.error) ||
            String(response.error || "Unknown error"),
        );
      }

      const result = response.data.data;
      setMergeSuccess(
        `Merged PGC ${result.merged_pgcs.join(", ")} into PGC ${result.target_pgc}. Reassigned ${result.reassigned_records} record(s).`,
      );
      setSource(null);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : String(err));
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="max-w-5xl flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold mb-4">Merge PGC objects</h2>
        <p className="text-sm text-muted">
          Select a target PGC (survives) and a source PGC (records are
          reassigned, then the source disappears). You probably will want to
          rerun import to layer 2 after this operation to update references.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <PgcPicker
          label="Target PGC"
          selection={target}
          onSelect={(selection) => {
            setTarget(selection);
            setMergeError(null);
            setMergeSuccess(null);
          }}
          disabled={merging}
        />
        <PgcPicker
          label="Source PGC"
          selection={source}
          onSelect={(selection) => {
            setSource(selection);
            setMergeError(null);
            setMergeSuccess(null);
          }}
          disabled={merging}
        />
      </div>

      {samePgc ? (
        <p className="text-danger text-sm" role="alert">
          Target and source must be different PGC numbers.
        </p>
      ) : null}

      {skyView ? (
        <AladinViewer
          ra={skyView.ra}
          dec={skyView.dec}
          fov={skyView.fov}
          className="w-full h-96"
          additionalSources={skySources}
        />
      ) : null}

      <div className="flex flex-col gap-2 items-start">
        <Button
          type="button"
          disabled={!canMerge}
          onClick={() => void handleMerge()}
        >
          {merging ? "Merging…" : "Merge PGCs"}
        </Button>
        {mergeError ? (
          <p className="text-danger text-sm" role="alert">
            {mergeError}
          </p>
        ) : null}
        {mergeSuccess ? (
          <p className="text-sm text-primary" role="status">
            {mergeSuccess}
          </p>
        ) : null}
      </div>
    </div>
  );
}
