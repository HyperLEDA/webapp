import { ReactElement } from "react";

interface LinkProps {
  children?: ReactElement | string;
  href: string;
}

export function Link(props: LinkProps): ReactElement {
  const content = props.children ?? props.href;
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      href={props.href}
      className="text-green-500 hover:text-green-600 transition-colors"
    >
      {content}
    </a>
  );
}
