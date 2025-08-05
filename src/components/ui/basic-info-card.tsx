import React from "react";
import { Card, CardContent } from "./card";

interface BasicInfoCardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const BasicInfoCard: React.FC<BasicInfoCardProps> = ({
    title,
    children,
    className = "mb-1",
}) => {
    return (
        <Card className={className} title={title}>
            <CardContent>{children}</CardContent>
        </Card>
    );
}; 