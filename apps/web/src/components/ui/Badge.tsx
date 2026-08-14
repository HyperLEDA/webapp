import { ReactElement } from "react";
import { Link } from "../core/Link";

export type BadgeType = "info" | "success" | "warning";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  type?: BadgeType;
}

const typeClasses: Record<BadgeType, string> = {
  info: "bg-surface-2 border-2 border-border text-primary",
  success: "bg-success/20 border-2 border-success/60 text-primary",
  warning: "bg-warning/20 border-2 border-warning/60 text-primary",
};

export function Badge({
  children,
  className = "",
  href,
  type = "info",
}: BadgeProps): ReactElement {
  const badgeClasses = `inline-block ${typeClasses[type]} rounded px-1.5 py-0.5 text-sm mr-0.5 mb-0.5 ${className}`;

  if (href) {
    return (
      <Link href={href}>
        <span className={badgeClasses}>{children}</span>
      </Link>
    );
  }

  return <div className={badgeClasses}>{children}</div>;
}
