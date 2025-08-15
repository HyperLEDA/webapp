import React, { useState, useRef, useEffect } from "react";

interface DataTableProps {
    data: Array<{
        label: string;
        hint?: string;
        value: string | number;
        unit?: string;
        error?: string | number;
        errorUnit?: string;
    }>;
    className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, className = "" }) => {
    const [activeHint, setActiveHint] = useState<number | null>(null);
    const [isHovering, setIsHovering] = useState<number | null>(null);
    const tableRef = useRef<HTMLTableElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
                setActiveHint(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleQuestionMarkClick = (index: number) => {
        setActiveHint(activeHint === index ? null : index);
    };

    const handleQuestionMarkMouseEnter = (index: number) => {
        setIsHovering(index);
    };

    const handleQuestionMarkMouseLeave = () => {
        setIsHovering(null);
    };

    return (
        <table ref={tableRef} className={className}>
            <tbody>
                {data.map((item, index) => (
                    <tr key={index}>
                        <td className="font-medium pr-4 flex items-center gap-2">
                            {item.label}
                            {item.hint && (
                                <div className="relative">
                                    <button
                                        className="text-gray-300 hover:text-gray-500 transition-colors p-0.5 w-5 h-5 flex items-center justify-center"
                                        onClick={() => handleQuestionMarkClick(index)}
                                        onMouseEnter={() => handleQuestionMarkMouseEnter(index)}
                                        onMouseLeave={handleQuestionMarkMouseLeave}
                                        aria-label="Show hint"
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-3 h-3"
                                        >
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
                                        </svg>
                                    </button>
                                    {(isHovering === index || activeHint === index) && (
                                        <div className="absolute z-10 left-0 top-6 w-auto max-w-l p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg border border-gray-700">
                                            {item.hint}
                                            <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-800 border-l border-t border-gray-700 transform rotate-45"></div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </td>
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