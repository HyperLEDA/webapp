import { ReactElement } from "react";
import { MdOpenInNew } from "react-icons/md";
import { Catalogs, Schema } from "../../clients/backend/types.gen";
import { Quantity, QuantityWithError } from "../core/Astronomy";
import { Link } from "../core/Link";
import { Hint } from "../ui/Hint";
import {
  CatalogCard,
  CatalogCardAction,
  Field,
  getSourceLink,
} from "./CatalogCard";

export function IdentityCard({
  pgc,
  catalogs,
  schema,
  className,
}: {
  pgc: number;
  catalogs: Catalogs;
  schema: Schema;
  className?: string;
}): ReactElement {
  const name = catalogs?.designation?.name || `PGC ${pgc}`;
  const redshift = catalogs?.redshift;
  const heliocentric = catalogs?.velocity?.heliocentric;
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
      anchorId="identity"
      className={className}
    >
      <Field label="PGC">{pgc}</Field>
      {catalogs?.nature?.type_name && (
        <Field label="Nature">{catalogs.nature.type_name}</Field>
      )}
      {catalogs?.additional_designations &&
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
  );
}
