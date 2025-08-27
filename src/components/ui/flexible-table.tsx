import React from "react";
import classNames from "classnames";

interface Column {
    name: string;
}

interface FlexibleTableProps {
    columns: Column[];
    data: Record<string, string | number | undefined>[];
    className?: string;
    tableClassName?: string;
    headerClassName?: string;
    columnHeaderClassName?: string;
    cellClassName?: string;
    children?: React.ReactNode;
}

export const FlexibleTable: React.FC<FlexibleTableProps> = ({
    columns,
    data,
    className = "",
    tableClassName = "",
    headerClassName = "",
    columnHeaderClassName = "",
    cellClassName = "",
    children,
}) => {
    const renderCell = (value: string | number | undefined): React.ReactNode => {
        if (value === undefined || value === null) {
            return <span className="text-gray-400 italic">NULL</span>;
        }
        return <span>{String(value)}</span>;
    };

    return (
        <div className={classNames("w-full", className)}>
            {/* Header Section */}
            {children && (
                <div className={classNames("mb-4 p-4 bg-gray-50 rounded-lg", headerClassName)}>
                    {children}
                </div>
            )}

            {/* Table Section */}
            <div className={classNames("overflow-x-auto", tableClassName)}>
                <table className="w-full border-collapse border border-gray-300">
                    {/* Column Headers */}
                    <thead>
                        <tr className="bg-gray-100">
                            {columns.map((column) => (
                                <th
                                    key={column.name}
                                    className={classNames(
                                        "border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700",
                                        columnHeaderClassName
                                    )}
                                >
                                    {column.name}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={classNames(
                                    "hover:bg-gray-50",
                                    rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                                )}
                            >
                                {columns.map((column) => {
                                    const cellValue = row[column.name];
                                    return (
                                        <td
                                            key={column.name}
                                            className={classNames(
                                                "border border-gray-300 px-4 py-2 text-black",
                                                cellClassName
                                            )}
                                        >
                                            {renderCell(cellValue)}
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
};
