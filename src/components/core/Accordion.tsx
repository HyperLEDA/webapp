import React, { ReactElement, useState } from "react";
import classNames from "classnames";

interface AccordionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  titleClassName?: string;
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className,
  titleClassName,
}: AccordionProps): ReactElement {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={classNames("border border-gray-700 rounded-lg", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-gray-800 rounded-lg transition-colors duration-200"
      >
        <span className={classNames(titleClassName ?? "text-xl font-bold")}>
          {title}
        </span>
        <span
          className={classNames(
            "transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
