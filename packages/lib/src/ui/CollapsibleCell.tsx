import classNames from "classnames";
import {
  MouseEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MdKeyboardArrowDown } from "react-icons/md";

interface CollapsibleCellProps {
  children: ReactNode;
  resetKey: string;
}

export function CollapsibleCell({
  children,
  resetKey,
}: CollapsibleCellProps): ReactElement {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setIsCollapsible(false);
  }, [resetKey]);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element || expanded) {
      return;
    }

    function updateOverflow(): void {
      const current = contentRef.current;
      if (!current) {
        return;
      }
      const overflowing = current.scrollHeight > current.clientHeight + 1;
      setIsOverflowing(overflowing);
      setIsCollapsible(overflowing);
    }

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children, expanded, resetKey]);

  function handleExpand(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    setExpanded(true);
  }

  function handleCollapse(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    setExpanded(false);
  }

  function handleFocusIn(): void {
    setExpanded(true);
  }

  const showExpandControls = !expanded && isOverflowing;

  return (
    <div className="relative min-w-0">
      <div
        ref={contentRef}
        onFocusCapture={handleFocusIn}
        className={classNames(
          "min-w-0 text-sm break-words whitespace-pre-wrap",
          !expanded && "line-clamp-5",
        )}
      >
        {children}
      </div>
      {showExpandControls ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent"
          />
          <button
            type="button"
            aria-label="Expand cell"
            className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-surface-2 p-0.5 text-muted hover:text-primary cursor-pointer"
            onClick={handleExpand}
          >
            <MdKeyboardArrowDown className="w-4 h-4" aria-hidden />
          </button>
        </>
      ) : null}
      {expanded && isCollapsible ? (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            aria-label="Collapse cell"
            className="flex rounded-full border border-border bg-surface-2 p-0.5 text-muted hover:text-primary cursor-pointer"
            onClick={handleCollapse}
          >
            <MdKeyboardArrowDown className="w-4 h-4 rotate-180" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
