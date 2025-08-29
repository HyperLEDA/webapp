import React, { useEffect, useState } from "react";
import { GetTableResponse, HttpValidationError, Bibliography } from "../clients/admin/types.gen";
import { getTableAdminApiV1TableGet } from "../clients/admin/sdk.gen";
import { useNavigate, useParams } from "react-router-dom";
import { CommonTable } from "../components/ui/common-table";

const renderBibliography = (bib: Bibliography) => {
    var authors = ""

    if (bib.authors.length >= 1) {
        authors += bib.authors[0]
    }
    if (bib.authors.length >= 2) {
        authors += " et al."
    }

    authors += ` ${bib.year}`

    // const targetLink = `https://ui.adsabs.harvard.edu/abs/${bib.bibcode}/abstract`

    return `${authors}: "${bib.title}"`
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
            Parameter: "Bibliography",
            Value: renderBibliography(table.bibliography)
        }
    ]

    return <div>
        <CommonTable columns={infoColumns} data={infoValues}>
            <h2 className="text-2xl font-bold text-white mb-2">{tableName}</h2>
            <p className="text-gray-300">{table.description}</p>
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