import React, { ReactElement, ReactNode } from "react";
import classNames from "classnames";
import { Hint } from "./Hint";
import { Loading } from "../core/Loading";

export type CellPrimitive = ReactElement | string | number;

export interface Column {
  name: string;
  renderCell?: (value: CellPrimitive) => ReactNode;
  hint?: ReactElement;
}

interface CommonTableProps {
  columns: Column[];
  data: Record<string, CellPrimitive>[];
  loading?: boolean;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  columnHeaderClassName?: string;
  cellClassName?: string;
  children?: React.ReactNode;
  onRowClick?: (row: Record<string, CellPrimitive>, rowIndex: number) => void;
}

export function CommonTable({
  columns,
  data,
  loading = false,
  className = "",
  tableClassName = "",
  headerClassName = "bg-surface-2 border-border",
  columnHeaderClassName = "bg-surface-2 text-primary",
  cellClassName = "text-primary",
  children,
  onRowClick,
}: CommonTableProps): ReactElement {
  function renderCell(value: CellPrimitive, column: Column): ReactNode {
    if (column.renderCell) {
      return column.renderCell(value);
    }

    if (value === undefined || value === null) {
      return <div />;
    }

    if (React.isValidElement(value)) {
      return value;
    }

    return <span>{String(value)}</span>;
  }

  return (
    <div className={classNames("w-full z-0", className)}>
      {children && (
        <div
          className={classNames(
            "mb-1 p-2 bg-surface-2 rounded-sm",
            headerClassName,
          )}
        >
          {children}
        </div>
      )}

      <div className="relative">
        <div
          className={classNames(
            "overflow-x-auto",
            tableClassName,
            loading && "opacity-50 pointer-events-none",
          )}
        >
          <table className="w-full border-collapse border border-border rounded-sm">
            <thead>
              <tr className="bg-surface-2">
                {columns.map((column) => (
                  <th
                    key={column.name}
                    className={classNames(
                      "border border-border px-2 py-1 text-center font-semibold text-primary",
                      columnHeaderClassName,
                    )}
                  >
                    {column.hint ? (
                      <Hint hintContent={column.hint}>
                        <span>{column.name}</span>
                      </Hint>
                    ) : (
                      column.name
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={classNames(
                    "bg-surface hover:bg-surface-2 transition-colors duration-150",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {columns.map((column) => {
                    const cellValue = row[column.name];
                    return (
                      <td
                        key={column.name}
                        className={classNames(
                          "border border-border px-2 py-1",
                          cellClassName,
                        )}
                      >
                        {renderCell(cellValue, column)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-app/60">
            <Loading />
          </div>
        )}
      </div>
    </div>
  );
}
