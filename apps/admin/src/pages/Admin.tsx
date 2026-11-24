import { ReactElement, useEffect } from "react";
import { Link, Text } from "@leda/lib/ui";

const tasks = [
  {
    to: "/merge-pgc",
    title: "Merge PGC objects",
    description:
      "Reassign all records from a source PGC onto a surviving target PGC.",
  },
  {
    to: "/structured-upload",
    title: "Structured upload",
    description:
      "Start a task that uploads raw data into a layer 1 catalog.",
  },
  {
    to: "/tasks/crossmatch",
    title: "Crossmatch",
    description:
      "Cross-identify records in a layer 0 table against layer 2 objects.",
  },
  {
    to: "/tasks/submit-crossmatch",
    title: "Submit crossmatch results",
    description:
      "Assign PGCs from resolved crossmatch results in a layer 0 table.",
  },
];

export function AdminPage(): ReactElement {
  useEffect(() => {
    document.title = "Tasks | LEDA";
  }, []);

  return (
    <div className="max-w-3xl">
      <Text as="h2" style="header" size="medium" className="mb-6">
        Tasks
      </Text>
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
