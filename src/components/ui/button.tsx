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
        className,
        "px-4 py-2 box-border flex items-center font-semibold border-1 border-[#1a1a1a] rounded-lg bg-[#1a1a1a] hover:border-[#646cff] transition-colors active:border-white",
      )}
    >
      {children}
    </button>
  );
};
