import { ReactElement, ReactNode } from "react";
import { MdHelpOutline } from "react-icons/md";
import { AppTooltip } from "./AppTooltip";

interface HintProps {
  children?: ReactElement;
  hintContent: ReactNode;
  className?: string;
  trigger?: "icon" | "child";
}

export function Hint(props: HintProps): ReactElement {
  const trigger = props.trigger ?? "icon";

  if (trigger === "child") {
    return (
      <AppTooltip content={props.hintContent} className="max-w-xl">
        {props.children}
      </AppTooltip>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 ${props.className ?? ""}`}
    >
      <div>{props.children}</div>
      <div>
        <AppTooltip content={props.hintContent} className="max-w-xl">
          <MdHelpOutline />
        </AppTooltip>
      </div>
    </div>
  );
}
