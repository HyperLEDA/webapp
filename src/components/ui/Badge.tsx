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
  info: "bg-gray-600 border-2 border-gray-700",
  success: "bg-green-900 text-white border-2 border-green-800",
  warning: "bg-yellow-500 text-black border-2 border-yellow-600",
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
