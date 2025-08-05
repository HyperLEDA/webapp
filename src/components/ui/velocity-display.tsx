import React from "react";
import { Card, CardContent } from "./card";
import { DataTable } from "./data-table";
import { HeliocentricVelocity, Redshift, HeliocentricVelocityUnits } from "../../clients/backend";

interface VelocityDisplayProps {
    heliocentric: HeliocentricVelocity;
    redshift: Redshift;
    units: HeliocentricVelocityUnits;
}

export const VelocityDisplay: React.FC<VelocityDisplayProps> = ({
    heliocentric,
    redshift,
    units,
}) => {
    const velocityData = [
        {
            label: "cz",
            value: heliocentric.v.toFixed(2),
            unit: units.v,
            error: heliocentric.e_v.toFixed(2),
            errorUnit: units.e_v,
        },
        {
            label: "z",
            value: redshift.z.toFixed(4),
            error: redshift.e_z.toFixed(6),
        },
    ];

    return (
        <Card className="mt-4" title="Velocity">
            <CardContent>
                <DataTable data={velocityData} />
            </CardContent>
        </Card>
    );
}; 