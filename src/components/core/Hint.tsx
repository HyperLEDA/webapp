import { Tooltip } from "flowbite-react";
import { ReactElement, ReactNode } from "react";
import { MdHelpOutline } from "react-icons/md";

interface HintProps {
  children?: ReactElement;
  hintContent: ReactNode;
  className?: string;
  trigger?: "icon" | "child";
}

const tooltipClassName = "bg-gray-600 z-10 border-1 max-w-xl";
const tooltipTheme = { hidden: "invisible opacity-0 pointer-events-none" };

export function Hint(props: HintProps): ReactElement {
  const trigger = props.trigger ?? "icon";

  if (trigger === "child") {
    return (
      <Tooltip
        content={props.hintContent}
        arrow={false}
        placement="auto"
        className={tooltipClassName}
        theme={tooltipTheme}
      >
        {props.children}
      </Tooltip>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 ${props.className ?? ""}`}
    >
      <div>{props.children}</div>
      <div>
        <Tooltip
          content={props.hintContent}
          arrow={false}
          placement="auto"
          className={tooltipClassName}
          theme={tooltipTheme}
        >
          <MdHelpOutline />
        </Tooltip>
      </div>
    </div>
  );
}
