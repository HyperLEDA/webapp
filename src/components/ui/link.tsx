import React, { ReactElement } from "react";

interface LinkProps {
    children?: ReactElement | string;
    href: string;
}

export const Link: React.FC<LinkProps> = ({ children, href }) => {
    const content = children ?? href
    return <a target="_blank" rel="noopener noreferrer" href={href} className="text-green-500 hover:text-green-600 transition-colors">
        {content}
    </a>
}