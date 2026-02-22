import { ReactElement, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
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
  const combinedClassName = `${className} inline-flex items-center gap-1`;

  if (props.external) {
    return (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={props.href}
        className={combinedClassName}
      >
        {content}
        <MdOpenInNew />
      </a>
    );
  }

  return (
    <RouterLink to={props.href} className={combinedClassName}>
      {content}
    </RouterLink>
  );
}
