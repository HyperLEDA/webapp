import { ReactElement, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { isLoggedIn } from "@hyperleda/lib/auth";
import { Link } from "../components/core/Link";

const tasks = [
  {
    to: "/admin/merge-pgc",
    title: "Merge PGC objects",
    description:
      "Reassign all records from a source PGC onto a surviving target PGC.",
  },
];

export function AdminPage(): ReactElement {
  useEffect(() => {
    document.title = "Admin | HyperLEDA";
  }, []);

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl font-bold mb-4">Admin</h2>
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
