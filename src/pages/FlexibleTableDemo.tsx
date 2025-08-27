import React from "react";
import { FlexibleTable } from "../components/ui/flexible-table";
import { Card } from "../components/ui/card";

const FlexibleTableDemo: React.FC = () => {
    // Debug test - simple table
    const testColumns = [
        { name: "Test1" },
        { name: "Test2" },
    ];

    const testData = [
        { Test1: "Hello", Test2: "World" },
        { Test1: "Foo", Test2: "Bar" },
    ];

    // Example 1: Simple table with basic data
    const simpleColumns = [
        { name: "Name" },
        { name: "Age" },
        { name: "City" },
        { name: "Occupation" },
    ];

    const simpleData = [
        { Name: "John Doe", Age: 30, City: "New York", Occupation: "Engineer" },
        { Name: "Jane Smith", Age: 25, City: "Los Angeles", Occupation: "Designer" },
        { Name: "Bob Johnson", Age: 35, City: "Chicago", Occupation: "Manager" },
    ];

    // Example 2: Table with missing data (NULL values)
    const dataWithNulls = [
        { Name: "Alice Brown", Age: 28, City: "Boston", Occupation: "Developer" },
        { Name: "Charlie Wilson", Age: 32, City: "NULL", Occupation: "NULL" },
        { Name: "Diana Davis", Age: 29, City: "Seattle", Occupation: "NULL" },
    ];

    // Example 3: Table with extra columns in data (should be ignored)
    const dataWithExtraColumns = [
        { Name: "Eve Miller", Age: 27, City: "Austin", Occupation: "Analyst", ExtraField: "Should be ignored" },
        { Name: "Frank Garcia", Age: 31, City: "Denver", Occupation: "Consultant", AnotherField: 123 },
    ];



    const galaxyColumns = [
        { name: "Galaxy Name" },
        { name: "Right Ascension" },
        { name: "Declination" },
        { name: "Redshift" },
        { name: "Magnitude" },
    ];

    const galaxyData = [
        {
            "Galaxy Name": "NGC 224",
            "Right Ascension": "00h 42m 44.3s",
            "Declination": "+41° 16' 09\"",
            "Redshift": 0.001,
            "Magnitude": 3.44,
        },
        {
            "Galaxy Name": "NGC 598",
            "Right Ascension": "01h 33m 50.9s",
            "Declination": "+30° 39' 37\"",
            "Redshift": 0.002,
            "Magnitude": 5.69,
        },
        {
            "Galaxy Name": "NGC 3031",
            "Right Ascension": "09h 55m 33.2s",
            "Declination": "+69° 03' 55\"",
            "Redshift": 0.001,
            "Magnitude": 6.94,
        },
    ];

    return (
        <div className="container mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Flexible Table Component Demo</h1>

            <FlexibleTable
                columns={testColumns}
                data={testData}
            />

            {/* Example 1: Simple Table */}
            <Card title="Example 1: Simple Table">
                <FlexibleTable
                    columns={simpleColumns}
                    data={simpleData}
                />
            </Card>

            {/* Example 2: Table with NULL Values */}
            <Card title="Example 2: Table with NULL Values">
                <FlexibleTable
                    columns={simpleColumns}
                    data={dataWithNulls}
                />
            </Card>

            {/* Example 3: Table with Extra Columns (Ignored) */}
            <Card title="Example 3: Table with Extra Columns (Should be Ignored)">
                <FlexibleTable
                    columns={simpleColumns}
                    data={dataWithExtraColumns}
                />
            </Card>

            {/* Example 4: Table with Header Components */}
            <Card title="Example 4: Table with Header Components">
                <FlexibleTable
                    columns={galaxyColumns}
                    data={galaxyData}
                >
                    <h2 className="text-xl font-bold text-gray-800">Galaxy Data Sample</h2>
                    <p className="text-gray-600">
                        This table shows sample astronomical data from the HyperLEDA database.
                    </p>
                    <div className="flex gap-4 text-sm text-gray-500">
                        <span>Source: HyperLEDA Database</span>
                        <span>Last Updated: 2024-01-15</span>
                        <span>Total Records: 3</span>
                    </div>
                </FlexibleTable>
            </Card>

            {/* Example 5: Custom Styled Table */}
            <Card title="Example 5: Custom Styled Table">
                <FlexibleTable
                    columns={simpleColumns}
                    data={simpleData}
                    className="max-w-2xl"
                    headerClassName="bg-blue-50 border-blue-200"
                    columnHeaderClassName="bg-blue-100 text-blue-800"
                    cellClassName="text-sm"
                />
            </Card>
        </div>
    );
};

export default FlexibleTableDemo;
