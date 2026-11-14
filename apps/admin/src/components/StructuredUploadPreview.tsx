import { ReactElement } from "react";
import classNames from "classnames";
import type { PreviewRow } from "../clients/admin";

export function StructuredUploadPreview({
  rows,
  fields,
}: {
  rows: PreviewRow[];
  fields: string[];
}): ReactElement {
  const inputColumns = [
    ...new Set(rows.flatMap((row) => Object.keys(row.inputs))),
  ];

  return (
    <section className="mt-8 w-full min-w-0">
      <h3 className="font-semibold text-primary mb-2">Preview</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No rows returned.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-primary">
              <tr>
                <th className="px-3 py-2 text-left whitespace-nowrap">
                  record id
                </th>
                {inputColumns.map((column) => (
                  <th
                    key={`in:${column}`}
                    className="px-3 py-2 text-left whitespace-nowrap text-muted"
                    title="Input column"
                  >
                    {column} <span className="text-xs">(in)</span>
                  </th>
                ))}
                {fields.map((field) => (
                  <th
                    key={`out:${field}`}
                    className="px-3 py-2 text-left whitespace-nowrap"
                  >
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr
                  key={row.record_id}
                  className={classNames({ "opacity-50": row.skipped_reason })}
                >
                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                    {row.record_id}
                  </td>
                  {inputColumns.map((column) => (
                    <td
                      key={`in:${column}`}
                      className="px-3 py-2 whitespace-nowrap text-muted"
                    >
                      {String(row.inputs[column] ?? "")}
                    </td>
                  ))}
                  {row.skipped_reason ? (
                    <td
                      colSpan={Math.max(fields.length, 1)}
                      className="px-3 py-2 italic whitespace-nowrap"
                    >
                      {row.skipped_reason}
                    </td>
                  ) : (
                    fields.map((field) => (
                      <td
                        key={`out:${field}`}
                        className="px-3 py-2 whitespace-nowrap"
                      >
                        {String(row.outputs[field] ?? "")}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
