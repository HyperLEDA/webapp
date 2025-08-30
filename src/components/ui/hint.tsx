import { Tooltip } from "flowbite-react";
import { ReactElement } from "react";
import { MdHelpOutline } from "react-icons/md";

interface HintProps {
    children: ReactElement;
    hintContent: ReactElement;
    className?: string;
}

export const Hint: React.FC<HintProps> = ({ children, hintContent, className = "" }) => {
    return (
        <div className={`relative flex items-center justify-center gap-2 ${className}`}>
            <div>{children}</div>
            <div className="flex gap-2">
                <Tooltip content={hintContent} arrow={false} placement="top" className="bg-gray-600 px-2 border-1">
                    <MdHelpOutline />
                </Tooltip>
            </div>
        </div >
    );
};
