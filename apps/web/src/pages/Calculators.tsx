import { ReactElement, useEffect } from "react";
import { Link } from "@leda/lib/ui";

const calculators = [
  {
    to: "/calculators/reddening",
    title: "Reddening calculator",
    description:
      "Compute SFD E(B-V) and Fitzpatrick (1999) extinction Aλ for a sky position in a chosen photometric system.",
  },
];

export function CalculatorsPage(): ReactElement {
  useEffect(() => {
    document.title = "Calculators | LEDA";
  }, []);

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-bold mb-4">Calculators</h2>
      <ul className="flex flex-col gap-4">
        {calculators.map((calculator) => (
          <li key={calculator.to}>
            <Link href={calculator.to}>{calculator.title}</Link>
            <p className="text-sm text-muted mt-1">{calculator.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
