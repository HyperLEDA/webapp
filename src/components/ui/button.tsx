import React from "react";
import classNames from "classnames";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className,
  type = "button",
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        "px-4 py-2 bg-blue-500 text-white font-semibold rounded-2xl hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
};
