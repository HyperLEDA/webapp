import React, { ReactElement, ReactNode, useState } from "react";
import classNames from "classnames";
import { MdSettings } from "react-icons/md";
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

function columnLabel(column: Column): string {
  return column.label ?? column.slug;
}

function filterableSlugs(columns: Column[]): string[] {
  return columns
    .filter((column) => columnLabel(column) !== "")
    .map((column) => column.slug);
}

function hiddenSlugs(
  columns: Column[],
  visible: string[] | undefined,
): Set<string> {
  if (!visible) {
    return new Set();
  }
  return new Set(
    filterableSlugs(columns).filter((slug) => !visible.includes(slug)),
  );
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
  columnFilter?: boolean;
  defaultVisibleColumns?: string[];
  visibleColumns?: string[];
  onVisibleColumnsChange?: (visibleColumns: string[]) => void;
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
  columnFilter = false,
  defaultVisibleColumns,
  visibleColumns: visibleColumnsProp,
  onVisibleColumnsChange,
}: CommonTableProps): ReactElement {
  const controlled = visibleColumnsProp !== undefined;
  const [hiddenState, setHiddenState] = useState(() =>
    hiddenSlugs(columns, defaultVisibleColumns),
  );
  const hidden = controlled
    ? hiddenSlugs(columns, visibleColumnsProp)
    : hiddenState;

  const visibleColumns = columnFilter
    ? columns.filter((column) => !hidden.has(column.slug))
    : columns;

  function toggleColumn(slug: string): void {
    const nextHidden = new Set(hidden);
    if (nextHidden.has(slug)) {
      nextHidden.delete(slug);
    } else {
      nextHidden.add(slug);
    }
    onVisibleColumnsChange?.(
      filterableSlugs(columns).filter(
        (columnSlug) => !nextHidden.has(columnSlug),
      ),
    );
    if (!controlled) {
      setHiddenState(nextHidden);
    }
  }

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
            "mb-1 p-2 bg-surface-2 rounded",
            headerClassName,
          )}
        >
          {children}
        </div>
      )}
      {columnFilter && (
        <div className="mb-1 flex justify-end">
          <details className="relative">
            <summary
              className="flex cursor-pointer list-none items-center rounded-lg border border-surface-2 bg-surface-2 p-1.5 [&::-webkit-details-marker]:hidden"
              title="Columns"
              aria-label="Columns"
            >
              <MdSettings size={18} className="text-muted" aria-hidden />
            </summary>
            <div className="absolute right-0 top-full z-20 mt-1 min-w-48 w-max rounded-lg border border-border bg-surface-2 py-1 shadow-lg">
              {columns.map((column) => {
                const label = columnLabel(column);
                if (!label) {
                  return null;
                }
                return (
                  <label
                    key={column.slug}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={!hidden.has(column.slug)}
                      onChange={() => toggleColumn(column.slug)}
                      className="rounded border-border"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </details>
        </div>
      )}
      <div className="relative min-w-0 max-w-full">
        <div
          className={classNames(
            "min-w-0 max-w-full overflow-x-auto rounded-lg border border-border",
            tableClassName,
            loading && "opacity-50 pointer-events-none",
          )}
        >
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-surface-2">
                {visibleColumns.map((column) => {
                  const header = columnLabel(column);
                  return (
                    <th
                      key={column.slug}
                      className={classNames(
                        "border-b border-r border-border px-2 py-1 text-center font-semibold text-primary whitespace-nowrap last:border-r-0",
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

            <tbody className="[&>tr:last-child>td]:border-b-0">
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={classNames(
                    "bg-surface hover:bg-surface-2 transition-colors duration-150",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {visibleColumns.map((column) => {
                    const cellValue = row[column.slug];
                    return (
                      <td
                        key={column.slug}
                        className={classNames(
                          "min-w-0 border-b border-r border-border px-2 py-1 align-top [overflow-wrap:anywhere] last:border-r-0",
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
