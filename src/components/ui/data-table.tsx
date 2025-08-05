import React from "react";

interface DataTableProps {
    data: Array<{
        label: string;
        value: string | number;
        unit?: string;
        error?: string | number;
        errorUnit?: string;
    }>;
    className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, className = "" }) => {
    return (
        <table className={className}>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td className="font-medium pr-4">{item.label}</td>
                        <td>
                            {item.value}
                            {item.unit && ` ${item.unit}`}
                            {item.error && ` ± ${item.error}`}
                            {item.error && item.errorUnit && ` ${item.errorUnit}`}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}; 