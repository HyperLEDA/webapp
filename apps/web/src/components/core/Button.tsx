import React, { ReactElement } from "react";
import classNames from "classnames";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  transparent?: boolean;
  hoverText?: string;
}

export function Button(props: ButtonProps): ReactElement {
  return (
    <button
      type={props.type}
      onClick={(event) => props.onClick?.(event)}
      disabled={props.disabled}
      title={props.hoverText}
      aria-label={props.hoverText}
      className={classNames(
        "px-2 py-2 box-border flex items-center font-semibold rounded-lg transition-colors duration-300 cursor-pointer",
        props.transparent
          ? "border-0 bg-transparent hover:text-accent active:text-primary"
          : "border-1 border-surface-2 bg-surface-2 hover:border-accent active:border-primary",
        {
          "opacity-50 cursor-not-allowed hover:border-surface-2 active:border-surface-2 hover:text-inherit active:text-inherit":
            props.disabled,
        },
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}
