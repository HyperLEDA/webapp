import React, { useEffect, useState } from "react";
import { GetTableResponse, HttpValidationError } from "../clients/admin/types.gen";
import { getTableAdminApiV1TableGet } from "../clients/admin/sdk.gen";
import { useNavigate, useParams } from "react-router-dom";

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
                <div>{table?.bibliography.title}</div>
            ) : error ? (
                renderError(error)
            ) : (
                renderNotFound()
            )}
        </div>
    );
}