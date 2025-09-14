import { ReactElement } from "react";

interface LinkProps {
  children?: ReactElement | string;
  href: string;
  className?: string;
}

export function Link(props: LinkProps): ReactElement {
  const content = props.children ?? props.href;
  const baseClass = "text-green-500 hover:text-green-600 transition-colors";
  const className = props.className ? `${baseClass} ${props.className}` : baseClass;
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={props.href}
      className={className}
    >
      {content}
    </a>
  );
}
