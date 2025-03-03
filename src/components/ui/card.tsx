import React from "react";
import classNames from "classnames";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  title,
}) => {
  return (
    <div
      className={classNames(
        "shadow-md rounded p-4 hover:shadow-lg transition-shadow border border-gray-200",
        { "cursor-pointer": onClick },
        className
      )}
      onClick={onClick}
    >
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      {children}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
}) => {
  return <div className={classNames("p-2", className)}>{children}</div>;
};
