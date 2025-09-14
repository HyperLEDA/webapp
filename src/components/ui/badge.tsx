import { ReactElement } from "react";
import { Link } from "./link";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
}

export function Badge({
  children,
  className = "",
  href,
}: BadgeProps): ReactElement {
  const badgeClasses = `inline-block bg-gray-600 rounded px-1.5 py-0.5 text-sm mr-0.5 mb-0.5 ${className}`;

  if (href) {
    return (
      <Link href={href}>
        <span className={badgeClasses}>{children}</span>
      </Link>
    );
  }

  return <div className={badgeClasses}>{children}</div>;
}
