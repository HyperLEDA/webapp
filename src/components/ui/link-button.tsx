import { ReactElement, ReactNode } from "react";
import { MdOpenInNew } from "react-icons/md";
import { Link } from "./link";

interface LinkButtonProps {
  children?: ReactNode;
  to: string;
}

export function LinkButton(props: LinkButtonProps): ReactElement {
  return (
    <div className="font-mono relative flex items-center justify-between gap-2">
      <div className="flex items-center">{props.children}</div>
      <Link href={props.to} className="flex items-center">
        <MdOpenInNew />
      </Link>
    </div>
  );
}
