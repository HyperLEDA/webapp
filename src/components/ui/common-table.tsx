import React, { ReactElement, ReactNode } from "react";
import classNames from "classnames";
import { Hint } from "./hint";

export type CellPrimitive = ReactElement | string | number;

export interface Column {
  name: string;
  renderCell?: (value: CellPrimitive) => ReactNode;
  hint?: ReactElement;
}

interface CommonTableProps {
  columns: Column[];
  data: Record<string, CellPrimitive>[];
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
  className = "",
  tableClassName = "",
  headerClassName = "bg-gray-700 border-gray-600",
  columnHeaderClassName = "bg-gray-600 text-white",
  cellClassName = "text-gray-200",
  children,
  onRowClick,
}: CommonTableProps): ReactElement {
  function renderCell(value: CellPrimitive, column: Column): ReactElement {
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
            "mb-1 p-2 bg-gray-50 rounded-sm",
            headerClassName,
          )}
        >
          {children}
        </div>
      )}

      <div className={classNames("overflow-x-auto", tableClassName)}>
        <table className="w-full border-collapse border border-gray-300 rounded-sm">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column) => (
                <th
                  key={column.name}
                  className={classNames(
                    "border border-gray-300 px-2 py-1 text-center font-semibold text-gray-700",
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
                  "bg-gray-700 hover:bg-gray-800 transition-colors duration-150",
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
                        "border border-gray-300 px-2 py-1",
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
    </div>
  );
}
