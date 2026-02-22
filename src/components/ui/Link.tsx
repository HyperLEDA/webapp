import { ReactElement, ReactNode } from "react";
import { MdOpenInNew } from "react-icons/md";

interface LinkProps {
  children?: ReactNode;
  href: string;
  className?: string;
  external?: boolean;
}

export function Link(props: LinkProps): ReactElement {
  const content = props.children;
  const baseClass = "text-green-500 hover:text-green-600 transition-colors";
  const className = props.className
    ? `${baseClass} ${props.className}`
    : baseClass;

  const linkProps = props.external
    ? {
        target: "_blank",
        rel: "noopener noreferrer",
      }
    : {};

  return (
    <a
      {...linkProps}
      href={props.href}
      className={`${className} inline-flex items-center gap-1`}
    >
      {content}
      {props.external && <MdOpenInNew />}
    </a>
  );
}
