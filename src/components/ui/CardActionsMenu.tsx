import { ReactElement, useEffect, useId, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { MdMoreVert } from "react-icons/md";
import classNames from "classnames";
import { Button } from "../core/Button";

type CatalogCardActionCommon = {
  title: string;
  description?: string;
  icon?: IconType;
};

export type CatalogCardAction =
  | (CatalogCardActionCommon & { href: string; onClick?: never })
  | (CatalogCardActionCommon & { onClick: () => void; href?: never });

interface CardActionsMenuProps {
  actions: CatalogCardAction[];
}

const menuItemClassName =
  "flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-surface transition-colors";

function ActionMenuItemContent({
  action,
}: {
  action: CatalogCardAction;
}): ReactElement {
  const Icon = action.icon;

  return (
    <>
      {Icon && (
        <span
          className="size-4 shrink-0 flex items-center justify-center text-muted mt-0.5"
          aria-hidden
        >
          <Icon className="size-full" />
        </span>
      )}
      <span>
        <span className="block font-medium whitespace-nowrap">
          {action.title}
        </span>
        {action.description && (
          <span className="block text-muted text-xs mt-0.5">
            {action.description}
          </span>
        )}
      </span>
    </>
  );
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
    if ("onClick" in action && action.onClick) {
      action.onClick();
    }
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        className="!p-1.5 cursor-pointer"
        onClick={() => setOpen((value) => !value)}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <MdMoreVert size={18} className="text-muted" aria-hidden />
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={classNames(
            "absolute right-0 top-full z-20 mt-1 min-w-48 w-max",
            "rounded-lg border border-border bg-surface-2 py-1 shadow-lg",
          )}
        >
          {actions.map((action) =>
            "href" in action && action.href ? (
              <a
                key={action.title}
                href={action.href}
                role="menuitem"
                target="_blank"
                rel="noopener noreferrer"
                className={classNames(
                  menuItemClassName,
                  "no-underline text-inherit",
                )}
                onClick={() => setOpen(false)}
              >
                <ActionMenuItemContent action={action} />
              </a>
            ) : (
              <button
                key={action.title}
                type="button"
                role="menuitem"
                className={menuItemClassName}
                onClick={() => runAction(action)}
              >
                <ActionMenuItemContent action={action} />
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
