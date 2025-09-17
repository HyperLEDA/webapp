import { ReactElement } from "react";
import { Link } from "../components/ui/link";

const homePageHint: ReactElement = (
  <div>
    <div>Examples:</div>
    <ul>
      <li>
        Search by name: <Link href="/query?q=name:IC1445">name:IC1445</Link>
      </li>
      <li>
        Search by PGC number: <Link href="/query?q=pgc:112642">pgc:112642</Link>
      </li>
    </ul>
    <div>
      The search conditions can be concatenated with AND or OR operators. For
      example:
    </div>
    <ul>
      <li>
        Search by name and PGC number:{" "}
        <Link href="/query?q=name:IC1445%20AND%20pgc:112642">
          name:IC1445 and pgc:112642
        </Link>
      </li>
      <li>
        Search by name or PGC number:{" "}
        <Link href="/query?q=name:IC1445%20OR%20pgc:112642">
          name:IC4445 or pgc:87422
        </Link>
      </li>
    </ul>
  </div>
);

export function HomePage(): ReactElement {
  return (
    <>
      <div className="max-w-4xl mx-auto mt-8 prose prose-invert leading-none prose-a:no-underline">
        {homePageHint}
      </div>
    </>
  );
}
