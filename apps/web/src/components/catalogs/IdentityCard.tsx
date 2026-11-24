import { ReactElement } from "react";
import { MdOpenInNew } from "react-icons/md";
import { Catalogs, Schema } from "@leda/lib/clients/backend";
import { Hint, Link, Quantity, QuantityWithError } from "@leda/lib/ui";
import hubbleSequence from "../../lib/astronomy/hubbleSequence.json";
import {
  CatalogCard,
  CatalogCardAction,
  Field,
  getSourceLink,
} from "./CatalogCard";

function morphologyHint(t: number): string {
  const nearest = Math.min(11, Math.max(-6, Math.round(t)));
  const stage =
    hubbleSequence[String(nearest) as keyof typeof hubbleSequence];
  return `${stage.design}: ${stage.description}`;
}

export function IdentityCard({
  pgc,
  catalogs,
  schema,
  anchorId,
  className,
}: {
  pgc: number;
  catalogs: Catalogs;
  schema: Schema;
  anchorId?: string;
  className?: string;
}): ReactElement {
  const name = catalogs.designation?.name || `PGC ${pgc}`;
  const redshift = catalogs.redshift;
  const morphology = catalogs.morphology;
  const heliocentric = catalogs.velocity?.heliocentric;
  const heliocentricUnits = schema.units.velocity.heliocentric;
  const ohpMirrorUrl = `http://atlas.obs-hp.fr/hyperleda/ledacat.cgi?o=%23${pgc}`;
  const identityActions: CatalogCardAction[] = [
    {
      title: "Open OHP mirror",
      icon: MdOpenInNew,
      href: ohpMirrorUrl,
    },
  ];

  return (
    <CatalogCard
      title={name}
      actions={identityActions}
      anchorId={anchorId}
      className={className}
    >
      <Field label="PGC">{pgc}</Field>
      {catalogs.nature?.type_name && (
        <Field label="Nature">{catalogs.nature.type_name}</Field>
      )}
      {catalogs.additional_designations &&
        catalogs.additional_designations.length > 0 && (
          <Field label="Also known as">
            <ul className="list-none grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {catalogs.additional_designations.map((d, i) => (
                <li key={i} className="flex items-center gap-2 min-w-0">
                  <span>{d.name}</span>
                  <Hint
                    hintContent={
                      <span>
                        <Link href={getSourceLink(d.source.bibcode)} external>
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
      {redshift !== null && redshift !== undefined && (
        <Field label="Redshift">
          <QuantityWithError error={redshift.e_z} decimalPlaces={5}>
            {redshift.z.toFixed(5)}
          </QuantityWithError>
        </Field>
      )}
      {heliocentric !== undefined && (
        <Field label="Heliocentric">
          <QuantityWithError
            error={heliocentric.e_v}
            unit={heliocentricUnits.v}
          >
            <Quantity
              value={heliocentric.v.toFixed(0)}
              unit={heliocentricUnits.v}
            />
          </QuantityWithError>
        </Field>
      )}
      {morphology != null && (
        <Field label="Morphology">
          <Hint
            hintContent={morphologyHint(morphology.t)}
            className="gap-1 justify-start"
          >
            {morphology.em != null &&
            morphology.ep != null &&
            morphology.em === morphology.ep ? (
              <QuantityWithError error={morphology.em} decimalPlaces={1}>
                {morphology.t.toFixed(1)}
              </QuantityWithError>
            ) : (
              <span>
                {morphology.t.toFixed(1)}
                {morphology.em != null && morphology.ep != null
                  ? ` (+${morphology.ep.toFixed(1)}/−${morphology.em.toFixed(1)})`
                  : null}
              </span>
            )}
          </Hint>
        </Field>
      )}
    </CatalogCard>
  );
}
