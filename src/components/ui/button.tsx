import React, { ReactElement } from "react";
import classNames from "classnames";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function Button(props: ButtonProps): ReactElement {
  return (
    <button
      type={props.type}
      onClick={(event) => props.onClick?.(event)}
      disabled={props.disabled}
      className={classNames(
        "px-2 py-2 box-border flex items-center font-semibold border-1 border-[#1a1a1a] rounded-lg bg-[#1a1a1a] hover:border-[#646cff] transition-colors duration-300 active:border-white cursor-pointer",
        {
          "opacity-50 cursor-not-allowed hover:border-[#1a1a1a] active:border-[#1a1a1a]":
            props.disabled,
        },
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}
