import React, { ReactElement, useState } from "react";

interface AccordionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({
  title,
  description,
  children,
  defaultOpen = false,
}: AccordionProps): ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-600 rounded-lg bg-neutral-900/40">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-gray-800 rounded-lg transition-colors duration-200 gap-2"
      >
        <span className="flex flex-col items-start gap-0.5 text-left w-full min-w-0">
          <span className="text-sm text-white font-medium leading-snug">
            {title}
          </span>
          {description ? (
            <span className="font-mono text-xs text-gray-400 leading-snug">
              {description}
            </span>
          ) : null}
        </span>
        <span
          className={`shrink-0 transition-transform duration-200${isOpen ? " rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
