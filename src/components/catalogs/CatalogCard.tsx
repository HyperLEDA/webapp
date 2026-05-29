import classNames from "classnames";
import { Children, ReactElement, ReactNode, useState } from "react";
import { MdKeyboardArrowDown } from "react-icons/md";
import { useAnchoredElement } from "../../hooks/useAnchoredElement";
import { Button } from "../core/Button";
import { CardActionsMenu, CatalogCardAction } from "../ui/CardActionsMenu";
import { CardAnchorLink } from "../ui/CardAnchorLink";
import { CatalogOriginalDataEmbed } from "./CatalogOriginalDataEmbed";

export type { CatalogCardAction };

export function getSourceLink(bibcode: string): string {
  return `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`;
}

export function CatalogCard({
  title,
  children,
  actions,
  originalDataSql,
  anchorId,
  className,
  variant = "fields",
}: {
  title: string;
  children: ReactNode;
  actions?: CatalogCardAction[];
  originalDataSql?: string;
  anchorId?: string;
  className?: string;
  variant?: "fields" | "block";
}): ReactElement {
  const { ref, highlighted } = useAnchoredElement(anchorId ?? "");
  const [originalDataOpen, setOriginalDataOpen] = useState(false);
  const [originalDataMounted, setOriginalDataMounted] = useState(false);

  function toggleOriginalData(): void {
    if (originalDataOpen) {
      setOriginalDataOpen(false);
      return;
    }
    if (!originalDataMounted) {
      setOriginalDataMounted(true);
      requestAnimationFrame(() => setOriginalDataOpen(true));
      return;
    }
    setOriginalDataOpen(true);
  }

  const cardActions = actions ?? [];
  const hasActions = cardActions.length > 0;
  const hasHeaderControls = hasActions || Boolean(originalDataSql);

  return (
    <div
      ref={anchorId ? ref : undefined}
      id={anchorId}
      className={classNames(
        "rounded-lg border border-border bg-surface p-3",
        anchorId && highlighted && "card-anchor-highlight",
        className,
      )}
    >
      <div
        className={
          hasHeaderControls || anchorId
            ? "group/card flex items-start justify-between gap-2 mb-2"
            : "mb-2"
        }
      >
        <h3 className="text-base font-semibold min-w-0 flex items-center gap-1.5">
          {title}
          {anchorId && <CardAnchorLink anchorId={anchorId} />}
        </h3>
        {hasHeaderControls ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {originalDataSql ? (
              <Button
                type="button"
                className="!p-1.5 cursor-pointer"
                onClick={toggleOriginalData}
                aria-label={
                  originalDataOpen ? "Hide original data" : "View original data"
                }
                aria-expanded={originalDataOpen}
              >
                <MdKeyboardArrowDown
                  className={classNames(
                    "size-5 text-muted transition-transform duration-300 ease-in-out motion-reduce:transition-none",
                    originalDataOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </Button>
            ) : null}
            {hasActions ? <CardActionsMenu actions={cardActions} /> : null}
          </div>
        ) : null}
      </div>
      {variant === "fields" ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-base">
          {children}
        </dl>
      ) : (
        children
      )}
      {originalDataSql && originalDataMounted ? (
        <div
          className={classNames(
            "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
            originalDataOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={classNames(
                "transition-opacity duration-300 ease-in-out motion-reduce:transition-none",
                originalDataOpen ? "opacity-100" : "opacity-0",
              )}
            >
              <CatalogOriginalDataEmbed
                key={originalDataSql}
                sql={originalDataSql}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export function CatalogDetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement | null {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {items}
      </div>
    </section>
  );
}
