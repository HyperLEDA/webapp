import { ReactElement } from "react";
import { MdCheck, MdClose } from "react-icons/md";
import type { PreviewCrossmatchParameters } from "../../clients/admin";

const DASH_STATUSES = new Set(["new", "colliding"]);

const PARAMETER_ORDER: (keyof PreviewCrossmatchParameters)[] = [
  "coordinates",
  "name",
  "pgc",
  "redshift",
  "nature",
];

export function renderParameterMatches(
  status: string,
  parameters: PreviewCrossmatchParameters,
): ReactElement | string {
  const entries = PARAMETER_ORDER.flatMap((name) => {
    const matched = parameters[name];
    return matched === null || matched === undefined
      ? []
      : [[name, matched] as const];
  });
  if (DASH_STATUSES.has(status) || entries.length === 0) {
    return "—";
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {entries.map(([name, matched]) => (
        <span key={name} className="inline-flex items-center gap-0.5">
          {name}
          {matched ? (
            <MdCheck className="w-4 h-4 text-green-600" />
          ) : (
            <MdClose className="w-4 h-4 text-red-500" />
          )}
        </span>
      ))}
    </span>
  );
}
