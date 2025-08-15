import React from "react";
import { Card } from "./card";
import { DataTable } from "./data-table";
import { EquatorialCoordinates, GalacticCoordinates, EquatorialUnits, GalacticUnits } from "../../clients/backend";

interface CoordinateDisplayProps {
    equatorial: EquatorialCoordinates;
    galactic: GalacticCoordinates;
    units: {
        equatorial: EquatorialUnits;
        galactic: GalacticUnits;
    };
}

export const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({
    equatorial,
    galactic,
    units,
}) => {
    const equatorialData = [
        {
            label: "Right ascension",
            value: equatorial.ra.toFixed(2),
            unit: units.equatorial.ra,
            error: equatorial.e_ra.toFixed(2),
            errorUnit: units.equatorial.e_ra,
        },
        {
            label: "Declination",
            value: equatorial.dec.toFixed(2),
            unit: units.equatorial.dec,
            error: equatorial.e_dec.toFixed(2),
            errorUnit: units.equatorial.e_dec,
        },
    ];

    const galacticData = [
        {
            label: "Latitude",
            value: galactic.lat.toFixed(2),
            unit: units.galactic.lat,
            error: galactic.e_lat.toFixed(2),
            errorUnit: units.galactic.e_lat,
        },
        {
            label: "Longitude",
            value: galactic.lon.toFixed(2),
            unit: units.galactic.lon,
            error: galactic.e_lon.toFixed(2),
            errorUnit: units.galactic.e_lon,
        },
    ];

    return (
        <Card className="mb-4" title="Coordinates">
            <Card title="Equatorial">
                <DataTable data={equatorialData} />
            </Card>
            <Card title="Galactic">
                <DataTable data={galacticData} />
            </Card>
        </Card>
    );
}; 