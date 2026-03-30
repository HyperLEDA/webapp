import { ReactElement, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AladinViewer } from "../components/core/Aladin";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import { CatalogData } from "../components/ui/CatalogData";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/CommonTable";
import { Hint } from "../components/core/Hint";
import { Link } from "../components/core/Link";
import { Accordion } from "../components/core/Accordion";
import { querySimple } from "../clients/backend/sdk.gen";
import { NoteEntry, PgcObject, Schema } from "../clients/backend/types.gen";
import { useDataFetching } from "../hooks/useDataFetching";
import { backendClient } from "../clients/config";

interface ObjectDetailsProps {
  object: PgcObject;
  schema: Schema | null;
}

function getSourceLink(bibcode: string): string {
  return `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`;
}

function renderNoteSourceHint(note: NoteEntry): string {
  const source = note.source;
  const authors = source.authors.join(", ");

  return `${source.title} — ${authors} (${source.year})`;
}

function NotesSection({ notes }: { notes: NoteEntry[] }): ReactElement {
  const columns: Column[] = [{ name: "Source" }, { name: "Note" }];
  const data: Record<string, CellPrimitive>[] = notes.map((note) => ({
    Source: (
      <Hint hintContent={renderNoteSourceHint(note)} trigger="child">
        <Link href={getSourceLink(note.source.bibcode)} external>
          {note.source.bibcode}
        </Link>
      </Hint>
    ),
    Note: <span className="whitespace-pre-wrap">{note.note}</span>,
  }));

  return (
    <Accordion title="Notes" defaultOpen>
      <CommonTable columns={columns} data={data} />
    </Accordion>
  );
}

function ObjectDetails({ object, schema }: ObjectDetailsProps): ReactElement {
  if (!object || !schema) return <div />;

  const notes = object.catalogs?.notes ?? [];

  return (
    <div className="space-y-6 rounded-lg">
      <div className="flex items-start space-x-6">
        <div className="w-96 shrink-0">
          {object.catalogs?.coordinates && (
            <AladinViewer
              ra={object.catalogs.coordinates.equatorial.ra}
              dec={object.catalogs.coordinates.equatorial.dec}
              fov={0.02}
              className="w-96 h-96"
            />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">
            {object.catalogs?.designation?.name || `PGC ${object.pgc}`}
          </h2>
          <p>PGC: {object.pgc}</p>
          <Link
            href={`http://atlas.obs-hp.fr/hyperleda/ledacat.cgi?o=%23${object.pgc}`}
            external
          >
            OHP Mirror
          </Link>
          {object.catalogs?.additional_designations &&
            object.catalogs.additional_designations.length > 0 && (
              <div className="mt-4">
                <p className="font-medium mb-1">Also known as:</p>
                <ul className="list-none space-y-1">
                  {object.catalogs.additional_designations.map((d, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span>{d.name}</span>
                      <Hint
                        hintContent={
                          <span>
                            <Link
                              href={getSourceLink(d.source.bibcode)}
                              external
                            >
                              {d.source.bibcode}
                            </Link>
                            {`. ${d.source.title}. ${d.source.authors.join(", ")}. ${d.source.year}`}
                          </span>
                        }
                        className="gap-1"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </div>
      {notes.length > 0 && <NotesSection notes={notes} />}
      <CatalogData catalogs={object.catalogs} schema={schema} />
    </div>
  );
}

async function fetcher(
  pgcId: string | undefined,
): Promise<[PgcObject, Schema]> {
  if (!pgcId || isNaN(Number(pgcId))) {
    throw new Error(`Invalid PGC number: ${pgcId}`);
  }

  const response = await querySimple({
    client: backendClient,
    query: {
      pgcs: [Number(pgcId)],
    },
  });

  if (response.error || !response.data) {
    const err = response.error;
    throw new Error(
      `Error during query: ${typeof err === "object" ? JSON.stringify(err) : err}`,
    );
  }

  const objects = response.data.data.objects;
  const schema = response.data.data.schema;

  if (!objects || objects.length === 0) {
    throw new Error(`Object ${pgcId} not found`);
  }

  return [objects[0], schema];
}

export function ObjectDetailsPage(): ReactElement {
  const { pgcId } = useParams<{ pgcId: string }>();

  useEffect(() => {
    document.title = `PGC ${pgcId} | HyperLEDA`;
  }, [pgcId]);

  const {
    data: payload,
    loading,
    error,
  } = useDataFetching(() => fetcher(pgcId), [pgcId]);

  const [object, schema] = payload || [null, null];

  function Content(): ReactElement {
    if (loading) return <Loading />;
    if (error) return <ErrorPage message={error} />;
    if (object && schema)
      return <ObjectDetails object={object} schema={schema} />;

    return <ErrorPage message="Unknown error" />;
  }

  return <Content />;
}
