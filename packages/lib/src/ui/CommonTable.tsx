import React, { ReactElement, ReactNode } from "react";
import classNames from "classnames";
import { CollapsibleCell } from "./CollapsibleCell";
import { Hint } from "./Hint";
import { Loading } from "./Loading";

export type CellPrimitive = ReactElement | string | number;

export type ColumnWidth = "auto" | "fit";

export interface Column {
  slug: string;
  label?: string;
  renderCell?: (value: CellPrimitive) => ReactNode;
  hint?: ReactElement;
  width?: ColumnWidth;
}

function columnWidthClassName(width: ColumnWidth = "auto"): string | undefined {
  if (width === "fit") {
    return "w-px whitespace-nowrap text-center";
  }
  return undefined;
}

function cellResetKey(
  value: CellPrimitive,
  rowIndex: number,
  columnSlug: string,
): string {
  if (React.isValidElement(value)) {
    return `${rowIndex}:${columnSlug}`;
  }
  return `${rowIndex}:${columnSlug}:${String(value)}`;
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
  function cellContent(value: CellPrimitive, column: Column): ReactNode {
    if (column.renderCell) {
      return column.renderCell(value);
    }

    if (React.isValidElement(value)) {
      return value;
    }

    return <span className="whitespace-pre-wrap">{String(value)}</span>;
  }

  function renderCell(
    value: CellPrimitive,
    column: Column,
    rowIndex: number,
  ): ReactNode {
    return (
      <CollapsibleCell resetKey={cellResetKey(value, rowIndex, column.slug)}>
        {cellContent(value, column)}
      </CollapsibleCell>
    );
  }

  return (
    <div className={classNames("min-w-0 max-w-full w-full", className)}>
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
      <div className="relative min-w-0 max-w-full">
        <div
          className={classNames(
            "min-w-0 max-w-full overflow-x-auto",
            tableClassName,
            loading && "opacity-50 pointer-events-none",
          )}
        >
          <table className="w-full table-auto border-collapse border border-border rounded-sm">
            <thead>
              <tr className="bg-surface-2">
                {columns.map((column) => {
                  const header = column.label ?? column.slug;
                  return (
                    <th
                      key={column.slug}
                      className={classNames(
                        "border border-border px-2 py-1 text-center font-semibold text-primary whitespace-nowrap",
                        columnHeaderClassName,
                        columnWidthClassName(column.width),
                      )}
                    >
                      {column.hint ? (
                        <Hint hintContent={column.hint}>
                          <span>{header}</span>
                        </Hint>
                      ) : (
                        header
                      )}
                    </th>
                  );
                })}
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
                    const cellValue = row[column.slug];
                    return (
                      <td
                        key={column.slug}
                        className={classNames(
                          "min-w-0 border border-border px-2 py-1 align-top [overflow-wrap:anywhere]",
                          cellClassName,
                          columnWidthClassName(column.width),
                        )}
                      >
                        {renderCell(cellValue, column, rowIndex)}
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
