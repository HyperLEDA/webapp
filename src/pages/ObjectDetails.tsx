import { ReactElement, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AladinViewer } from "../components/core/Aladin";
import { Loading } from "../components/core/Loading";
import { ErrorPage } from "../components/ui/ErrorPage";
import {
  CatalogCard,
  CatalogDetailSection,
  EquatorialCoordinatesCard,
  GalacticCoordinatesCard,
  Field,
  RedshiftCard,
  VelocitiesCard,
} from "../components/ui/CatalogData";
import {
  CommonTable,
  Column,
  CellPrimitive,
} from "../components/ui/CommonTable";
import { Hint } from "../components/ui/Hint";
import { Link } from "../components/core/Link";
import { querySimple } from "../clients/backend/sdk.gen";
import { NoteEntry, PgcObject, Schema } from "../clients/backend/types.gen";
import { useDataFetching } from "../hooks/useDataFetching";
import { backendClient } from "../clients/config";
import { Quantity, QuantityWithError } from "../components/core/Astronomy";

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
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Notes</h2>
      <div className="rounded-lg border border-border bg-surface p-4 overflow-x-auto">
        <CommonTable columns={columns} data={data} />
      </div>
    </section>
  );
}

function IdentityHeader({
  object,
  schema,
}: {
  object: PgcObject;
  schema: Schema;
}): ReactElement {
  const catalogs = object.catalogs;
  const name = catalogs?.designation?.name || `PGC ${object.pgc}`;
  const redshift = catalogs?.redshift;
  const heliocentric = catalogs?.velocity?.heliocentric;

  return (
    <div className="flex flex-col lg:flex-row items-start gap-6">
      {catalogs?.coordinates?.equatorial && (
        <AladinViewer
          ra={catalogs.coordinates.equatorial.ra}
          dec={catalogs.coordinates.equatorial.dec}
          fov={0.02}
          className="w-full max-w-96 aspect-square lg:w-96 lg:h-96 shrink-0"
        />
      )}
      <div className="flex-1 min-w-0 w-full">
        <CatalogCard title={name}>
          <Field label="PGC">{object.pgc}</Field>
          <Field label="OHP Mirror">
            <Link
              href={`http://atlas.obs-hp.fr/hyperleda/ledacat.cgi?o=%23${object.pgc}`}
              external
            >
              View on OHP
            </Link>
          </Field>
          {catalogs?.additional_designations &&
            catalogs.additional_designations.length > 0 && (
              <Field label="Also known as">
                <ul className="list-none space-y-1">
                  {catalogs.additional_designations.map((d, i) => (
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
              </Field>
            )}
          {redshift?.z !== undefined && (
            <Field label="Redshift">
              <QuantityWithError error={redshift.e_z} decimalPlaces={5}>
                {redshift.z.toFixed(5)}
              </QuantityWithError>
            </Field>
          )}
          {heliocentric?.v !== undefined && (
            <Field label="Heliocentric">
              <QuantityWithError
                error={heliocentric.e_v}
                unit={schema.units.velocity?.heliocentric?.v}
              >
                <Quantity
                  value={heliocentric.v.toFixed(0)}
                  unit={schema.units.velocity?.heliocentric?.v}
                />
              </QuantityWithError>
            </Field>
          )}
        </CatalogCard>
      </div>
    </div>
  );
}

function ObjectDetails({ object, schema }: ObjectDetailsProps): ReactElement {
  if (!object || !schema) return <div />;

  const catalogs = object.catalogs;

  return (
    <div className="space-y-8 rounded-lg">
      <IdentityHeader object={object} schema={schema} />

      <div className="space-y-8">
        <CatalogDetailSection title="Astrometry">
          <EquatorialCoordinatesCard catalogs={catalogs} schema={schema} />
          <GalacticCoordinatesCard catalogs={catalogs} schema={schema} />
        </CatalogDetailSection>

        <CatalogDetailSection title="Kinematics">
          <RedshiftCard catalogs={catalogs} />
          <VelocitiesCard catalogs={catalogs} schema={schema} />
        </CatalogDetailSection>

        {catalogs?.notes && catalogs.notes.length > 0 && (
          <NotesSection notes={catalogs.notes} />
        )}
      </div>
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
