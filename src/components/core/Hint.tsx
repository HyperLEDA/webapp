import { Tooltip } from "flowbite-react";
import { ReactElement, ReactNode } from "react";
import { MdHelpOutline } from "react-icons/md";

export type HintPosition = "top" | "left" | "right" | "bottom";

interface HintProps {
  children: ReactElement;
  hintContent: ReactNode;
  position?: HintPosition;
  className?: string;
  trigger?: "icon" | "child";
}

const tooltipClassName = "bg-gray-600 z-10 border-1 max-w-xl";

export function Hint(props: HintProps): ReactElement {
  const placement = props.position ?? "top";
  const trigger = props.trigger ?? "icon";

  if (trigger === "child") {
    return (
      <Tooltip
        content={props.hintContent}
        arrow={false}
        placement={placement}
        className={tooltipClassName}
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
          placement={placement}
          className={tooltipClassName}
        >
          <MdHelpOutline />
        </Tooltip>
      </div>
    </div>
  );
}
