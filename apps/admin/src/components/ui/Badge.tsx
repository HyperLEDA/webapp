import { ReactElement } from "react";
import { Link } from "@leda/lib/ui";

export type BadgeType = "info" | "success" | "warning";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  external?: boolean;
  type?: BadgeType;
}

const typeClasses = {
  info: "bg-surface-2 border-2 border-border text-primary",
  success: "bg-success/20 border-2 border-success/60 text-primary",
  warning: "bg-warning/20 border-2 border-warning/60 text-primary",
} satisfies Record<BadgeType, string>;

export function Badge({
  children,
  className = "",
  href,
  external = false,
  type = "info",
}: BadgeProps): ReactElement {
  const badgeClasses = `inline-block ${typeClasses[type]} rounded px-1.5 py-0.5 text-sm mr-0.5 mb-0.5 ${className}`;

  if (href) {
    return (
      <Link href={href} external={external}>
        <span className={badgeClasses}>{children}</span>
      </Link>
    );
  }

  return <div className={badgeClasses}>{children}</div>;
}
