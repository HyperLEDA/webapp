import { ReactElement } from "react";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps): ReactElement {
  return (
    <div
      className={`inline-block bg-gray-600 rounded px-1.5 py-0.5 text-sm ${className}`}
    >
      {children}
    </div>
  );
}
