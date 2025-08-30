import React from "react";
import classNames from "classnames";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export const Card: React.FC<CardProps> = (params) => <div
  className={classNames(
    "shadow-md rounded p-2 hover:shadow-lg transition-shadow border border-gray-200",
    { "cursor-pointer": params.onClick },
    params.className
  )}
  onClick={params.onClick}
>
  {params.title && <h3 className="text-lg font-semibold mb-1">{params.title}</h3>}
  {params.children}
</div>;

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = (params) => <div className={classNames("p-2", params.className)}>
  {params.children}
</div>;
