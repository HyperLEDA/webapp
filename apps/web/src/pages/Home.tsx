import { ReactElement, useEffect } from "react";
import { AppTooltip, Link } from "@leda/lib/ui";

type SearchExample = {
  label: string;
  query: string;
  hint?: string;
};

const searchExamples: SearchExample[] = [
  { label: "PGC number", query: "2553" },
  { label: "Exact name", query: "IC 144" },
  {
    label: "Name with wildcard",
    query: "IC 144%",
    hint: "⚠️ This type of search can be slow. Prefer using an exact name if can.",
  },
  { label: "Coordinates", query: "J123049.42+122328.0" },
  { label: "Coordinates", query: '12h 30m 49.42s +12d 23m 28.0"' },
  { label: "Coordinates", query: "189.0866 +25.9875" },
  { label: "B1950 coordinates", query: "B132746.30+472711.0" },
  { label: "Galactic coordinates", query: "G208.711+44.539" },
  { label: "Supergalactic coordinates", query: "S95.61+6.12" },
];

const cardClassName =
  "h-full w-full rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-accent";

function searchHref(query: string): string {
  return `/query?q=${encodeURIComponent(query)}`;
}

function SearchExampleCard({
  example,
}: {
  example: SearchExample;
}): ReactElement {
  return (
    <Link href={searchHref(example.query)} className={cardClassName}>
      <span className="flex w-full min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-muted">{example.label}</span>
        <span className="font-mono text-sm break-all">{example.query}</span>
      </span>
    </Link>
  );
}

export function HomePage(): ReactElement {
  useEffect(() => {
    document.title = "LEDA";
  }, []);

  return (
    <div className="mx-auto mt-8 max-w-4xl">
      <h2 className="mb-3 text-sm font-medium text-muted">Examples</h2>
      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
        {searchExamples.map((example) => {
          const card = <SearchExampleCard example={example} />;
          return (
            <li key={example.query} className="min-w-0">
              {example.hint ? (
                <AppTooltip content={example.hint} placement="top">
                  <div className="h-full">{card}</div>
                </AppTooltip>
              ) : (
                card
              )}
            </li>
          );
        })}
        <li className="min-w-0 sm:col-span-2">
          <Link href="/sql" className={`${cardClassName} border-dashed`}>
            <span className="text-sm text-primary">
              Need a more complicated search? You can use SQL.
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
