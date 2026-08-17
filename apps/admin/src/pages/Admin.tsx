import { ReactElement, useEffect } from "react";
import { Link } from "@hyperleda/lib/ui";

const tasks = [
  {
    to: "/merge-pgc",
    title: "Merge PGC objects",
    description:
      "Reassign all records from a source PGC onto a surviving target PGC.",
  },
];

export function AdminPage(): ReactElement {
  useEffect(() => {
    document.title = "Tasks | HyperLEDA";
  }, []);

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-bold mb-4">Tasks</h2>
      <ul className="flex flex-col gap-4">
        {tasks.map((task) => (
          <li key={task.to}>
            <Link href={task.to}>{task.title}</Link>
            <p className="text-sm text-muted mt-1">{task.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
