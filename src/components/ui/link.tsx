import React, { ReactElement } from "react";

interface LinkProps {
    children: ReactElement | string;
    href: string;
}


export const Link: React.FC<LinkProps> = ({ children, href }) => {
    return <a target="_blank" rel="noopener noreferrer" href={href}>
        {children}
    </a>
}