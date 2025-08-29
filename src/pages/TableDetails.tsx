import React, { ReactElement, useEffect, useState } from "react";
import { GetTableResponse, HttpValidationError, Bibliography } from "../clients/admin/types.gen";
import { getTableAdminApiV1TableGet } from "../clients/admin/sdk.gen";
import { useNavigate, useParams } from "react-router-dom";
import { CommonTable, Column } from "../components/ui/common-table";

const renderBibliography = (bib: Bibliography) => {
    var authors = ""

    if (bib.authors.length >= 1) {
        authors += bib.authors[0]
    }
    if (bib.authors.length >= 2) {
        authors += " et al."
    }

    authors += ` ${bib.year}`

    const targetLink = "https://ui.adsabs.harvard.edu/abs/" + bib.bibcode + "/abstract"

    return <div><a href={targetLink}>{bib.bibcode}</a> | {authors}: "{bib.title}"</div>
}

function renderTime(time: string): string {
    const dt = new Date(time as string);

    return dt.toString()
}

function renderUCD(ucd: string | undefined | null): ReactElement {
    if (!ucd) {
        return <div></div>
    }

    var words: ReactElement[] = []

    ucd.split(";").forEach(word => {
        words.push(
            <div className="inline-block bg-gray-600 rounded px-1.5 py-0.5 text-sm mr-0.5 mb-0.5">{word}</div>
        )
    });

    return <div>{words}</div>
}

const renderTableDetails = (tableName: string, table: GetTableResponse) => {
    const infoColumns = [
        { name: "Parameter" },
        { name: "Value" }
    ]

    const infoValues = [
        {
            Parameter: "Table ID",
            Value: table.id,
        },
        {
            Parameter: "Source paper",
            Value: renderBibliography(table.bibliography)
        },
        {
            Parameter: "Number of records",
            Value: table.rows_num
        },
        {
            Parameter: "Type of data",
            Value: table.meta.datatype
        },
        {
            Parameter: "Modification time",
            Value: renderTime(table.meta.modification_dt as string)
        }
    ]

    const columnInfoColumns: Column[] = [
        { name: "Name" },
        { name: "Description" },
        { name: "Unit" },
        { name: "UCD", renderCell: renderUCD },
    ]

    var columnInfoValues: any[] = []

    table.column_info.forEach(col => {
        columnInfoValues.push({
            Name: <p className="font-mono">{col.name}</p>,
            Description: col.description,
            Unit: col.unit,
            UCD: col.ucd,
        })
    });

    return <div className="px-8">
        <CommonTable columns={infoColumns} data={infoValues} className="pb-5">
            <h2 className="text-2xl font-bold text-white mb-2">{table.description}</h2>
            <p className="text-gray-300 font-mono">{tableName}</p>
        </CommonTable>
        <CommonTable columns={columnInfoColumns} data={columnInfoValues}>
            <h2 className="text-2xl font-bold text-white">Column information</h2>
        </CommonTable>
    </div>
}

export const TableDetailsPage: React.FC = () => {
    const { tableName } = useParams<{ tableName: string }>();
    const [table, setTable] = useState<GetTableResponse | null>(null);
    const [error, setError] = useState<HttpValidationError | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            if (!tableName) {
                navigate("/");
                return;
            }

            try {
                const response = await getTableAdminApiV1TableGet({ query: { table_name: tableName } })
                if (response.error) {
                    setError(response.error)
                    return
                }

                if (response.data) {
                    setTable(response.data.data)
                }
            } catch (err) {
                console.log("Error fetching table", err)
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [tableName, navigate])

    const renderNotFound = () => (
        <div className="text-center">
            <p className="text-gray-300">Table not found.</p>
        </div>
    );

    const renderError = (error: HttpValidationError) => (
        <div className="text-center">
            <p className="text-gray-300">{error.detail?.toString()}</p>
        </div>
    );

    return (
        <div className="p-4">
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <p className="text-gray-300 text-lg">Loading...</p>
                </div>
            ) : table ? (
                renderTableDetails(tableName ?? "", table)
            ) : error ? (
                renderError(error)
            ) : (
                renderNotFound()
            )}
        </div>
    );
}