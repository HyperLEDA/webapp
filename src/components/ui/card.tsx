import React from "react";
import classNames from "classnames";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div
      className={classNames(
        "bg-white shadow-md rounded-2xl p-4 hover:shadow-lg transition-shadow cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => {
  return <div className={classNames("p-2", className)}>{children}</div>;
};
