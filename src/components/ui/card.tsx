import React, { ReactElement } from "react";
import classNames from "classnames";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function Card(props: CardProps): ReactElement {
  return (
    <div
      className={classNames(
        "shadow-md rounded p-2 hover:shadow-lg transition-shadow border border-gray-200",
        { "cursor-pointer": props.onClick },
        props.className,
      )}
      onClick={props.onClick}
    >
      {props.title && (
        <h3 className="text-lg font-semibold mb-1">{props.title}</h3>
      )}
      {props.children}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent(props: CardContentProps): ReactElement {
  return (
    <div className={classNames("p-2", props.className)}>{props.children}</div>
  );
}
