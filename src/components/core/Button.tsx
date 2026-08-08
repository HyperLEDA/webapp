import React, { ReactElement } from "react";
import classNames from "classnames";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  "aria-label"?: string;
  title?: string;
}

export function Button(props: ButtonProps): ReactElement {
  return (
    <button
      type={props.type}
      onClick={(event) => props.onClick?.(event)}
      disabled={props.disabled}
      aria-label={props["aria-label"]}
      title={props.title}
      className={classNames(
        "px-2 py-2 box-border flex items-center font-semibold border-1 border-surface-2 rounded-lg bg-surface-2 hover:border-accent transition-colors duration-300 active:border-primary cursor-pointer",
        {
          "opacity-50 cursor-not-allowed hover:border-surface-2 active:border-surface-2":
            props.disabled,
        },
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}
