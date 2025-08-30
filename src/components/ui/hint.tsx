import { Tooltip } from "flowbite-react";
import { ReactElement } from "react";
import { MdHelpOutline } from "react-icons/md";

interface HintProps {
    children: ReactElement;
    hintContent: ReactElement;
    className?: string;
}

export function Hint(props: HintProps): ReactElement {
    return <div className={`flex items-center justify-center gap-2 ${props.className}`}>
        <div>{props.children}</div>
        <div>
            <Tooltip content={props.hintContent} arrow={false} placement="top" className="bg-gray-600 px-2 border-1 max-w-xl">
                <MdHelpOutline />
            </Tooltip>
        </div>
    </div>
};
