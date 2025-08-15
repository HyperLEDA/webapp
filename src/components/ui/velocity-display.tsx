import React from "react";
import { Card, CardContent } from "./card";
import { DataTable } from "./data-table";
import { Redshift, AbsoluteVelocity, AbsoluteVelocityUnits } from "../../clients/backend/types.gen"

interface RedshiftDisplayProps {
    redshift: Redshift;
}

export const RedshiftDisplay: React.FC<RedshiftDisplayProps> = ({ redshift }) => {
    const data = [
        {
            label: "z",
            value: redshift.z.toFixed(4),
            error: redshift.e_z.toFixed(6),
        },
    ];

    return (
        <Card className="mt-4" title="Redshift">
            <CardContent>
                <DataTable data={data} />
            </CardContent>
        </Card>
    );
};

interface Dictionary<T> {
    [Key: string]: T;
}

interface VelocityDisplayProps {
    velocities: Dictionary<AbsoluteVelocity>
    units: Dictionary<AbsoluteVelocityUnits>
}

export const VelocityDisplay: React.FC<VelocityDisplayProps> = ({ velocities, units }) => {
    const data = [
        {
            label: "Heliocentric",
            value: velocities["heliocentric"].v.toFixed(2),
            unit: units["heliocentric"].v,
            error: velocities["heliocentric"].e_v.toFixed(2),
            errorUnit: units["heliocentric"].v,
        },
        {
            label: "Local group",
            hint: "Source: https://ui.adsabs.harvard.edu/abs/2025A%26A...698A.178M/abstract",
            value: velocities["local_group"].v.toFixed(2),
            unit: units["local_group"].v,
            error: velocities["local_group"].e_v.toFixed(2),
            errorUnit: units["local_group"].v,
        },
        {
            label: "CMB (old)",
            hint: "Source: https://ui.adsabs.harvard.edu/abs/1996ApJ...473..576F/abstract",
            value: velocities["cmb_old"].v.toFixed(2),
            unit: units["cmb_old"].v,
            error: velocities["cmb_old"].e_v.toFixed(2),
            errorUnit: units["cmb_old"].v,
        },
        {
            label: "CMB",
            hint: "Source: https://ui.adsabs.harvard.edu/abs/2016A%26A...594A...8P/abstract",
            value: velocities["cmb"].v.toFixed(2),
            unit: units["cmb"].v,
            error: velocities["cmb"].e_v.toFixed(2),
            errorUnit: units["cmb"].v,
        },
    ];

    return (
        <Card className="mt-4" title="Velocity">
            <CardContent>
                <DataTable data={data} />
            </CardContent>
        </Card>
    );
}; 
