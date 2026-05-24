import { Tooltip } from "flowbite-react";
import classNames from "classnames";
import { ReactElement, ReactNode } from "react";

const tooltipClassName =
  "bg-surface-2 z-10 border border-border text-primary text-sm";

const tooltipTheme = { hidden: "invisible opacity-0 pointer-events-none" };

interface AppTooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: "auto" | "top" | "right" | "bottom" | "left";
  className?: string;
}

export function AppTooltip({
  content,
  children,
  placement = "auto",
  className,
}: AppTooltipProps): ReactElement {
  return (
    <Tooltip
      content={content}
      placement={placement}
      arrow={false}
      className={classNames(tooltipClassName, className)}
      theme={tooltipTheme}
    >
      {children}
    </Tooltip>
  );
}
