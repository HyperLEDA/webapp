import { ReactElement, useEffect, useId, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { MdMoreVert } from "react-icons/md";
import classNames from "classnames";
import { Button } from "../core/Button";
import { AppTooltip } from "./AppTooltip";

export interface CatalogCardAction {
  title: string;
  description?: string;
  icon?: IconType;
  onClick: () => void;
}

interface CardActionsMenuProps {
  actions: CatalogCardAction[];
}

export function CardActionsMenu({
  actions,
}: CardActionsMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function runAction(action: CatalogCardAction): void {
    action.onClick();
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <AppTooltip content="Actions" placement="left">
        <Button
          type="button"
          className="!p-1.5 cursor-pointer"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
        >
          <MdMoreVert size={18} className="text-muted" aria-hidden />
        </Button>
      </AppTooltip>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={classNames(
            "absolute right-0 top-full z-20 mt-1 min-w-48 max-w-xs",
            "rounded-lg border border-border bg-surface-2 py-1 shadow-lg",
          )}
        >
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.title}
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-surface transition-colors"
                onClick={() => runAction(action)}
              >
                {Icon && (
                  <span
                    className="size-4 shrink-0 flex items-center justify-center text-muted mt-0.5"
                    aria-hidden
                  >
                    <Icon className="size-full" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block font-medium">{action.title}</span>
                  {action.description && (
                    <span className="block text-muted text-xs mt-0.5">
                      {action.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
