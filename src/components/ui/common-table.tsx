import React from "react";
import classNames from "classnames";

interface Column {
    name: string;
    renderCell?: (value: any) => React.ReactNode;
}

interface CommonTableProps {
    columns: Column[];
    data: Record<string, any>[];
    className?: string;
    tableClassName?: string;
    headerClassName?: string;
    columnHeaderClassName?: string;
    cellClassName?: string;
    children?: React.ReactNode;
}

export const CommonTable: React.FC<CommonTableProps> = ({
    columns,
    data,
    className = "",
    tableClassName = "",
    headerClassName = "bg-gray-700 border-gray-600",
    columnHeaderClassName = "bg-gray-600 text-white",
    cellClassName = "bg-gray-700 text-gray-200",
    children,
}) => {
    const renderCell = (value: any, column: Column): React.ReactNode => {
        if (column.renderCell) {
            return column.renderCell(value);
        }

        if (value === undefined || value === null) {
            return <span className="text-gray-400 italic">NULL</span>;
        }

        if (React.isValidElement(value)) {
            return value;
        }

        return <span>{String(value)}</span>;
    };

    return (
        <div className={classNames("w-full", className)}>
            {children && (
                <div className={classNames("mb-1 p-4 bg-gray-50 rounded-sm", headerClassName)}>
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
                                        "border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700",
                                        columnHeaderClassName
                                    )}
                                >
                                    {column.name}
                                </th>
                            ))}
                        </tr>
                    </thead>

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
};
