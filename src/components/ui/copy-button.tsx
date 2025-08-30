import { ReactElement, useState } from "react";
import { Button } from "./button";
import { MdCheck, MdContentCopy } from "react-icons/md";

interface CopyButtonProps {
    children: ReactElement;
    textToCopy: string;
}

export function CopyButton(props: CopyButtonProps): ReactElement {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(props.textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className="font-mono group relative flex items-center justify-between">
            <div>{props.children}</div>
            <Button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {copied ? (
                    <MdCheck className="text-gray-400" />
                ) : (
                    <MdContentCopy className="text-gray-400" />
                )}
            </Button>
        </div>
    );
};
