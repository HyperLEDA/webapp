import classNames from "classnames";
import { Children, ReactElement, ReactNode } from "react";
import { useAnchoredElement } from "../../hooks/useAnchoredElement";
import { CardActionsMenu, CatalogCardAction } from "../ui/CardActionsMenu";
import { CardAnchorLink } from "../ui/CardAnchorLink";

export type { CatalogCardAction };

export function getSourceLink(bibcode: string): string {
  return `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`;
}

export function CatalogCard({
  title,
  children,
  actions,
  anchorId,
  className,
  variant = "fields",
}: {
  title: string;
  children: ReactNode;
  actions?: CatalogCardAction[];
  anchorId?: string;
  className?: string;
  variant?: "fields" | "block";
}): ReactElement {
  const { ref, highlighted } = useAnchoredElement(anchorId ?? "");
  const hasActions = actions !== undefined && actions.length > 0;

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
          hasActions || anchorId
            ? "group/card flex items-start justify-between gap-2 mb-2"
            : "mb-2"
        }
      >
        <h3 className="text-base font-semibold min-w-0 flex items-center gap-1.5">
          {title}
          {anchorId && <CardAnchorLink anchorId={anchorId} />}
        </h3>
        {hasActions && <CardActionsMenu actions={actions} />}
      </div>
      {variant === "fields" ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-base">
          {children}
        </dl>
      ) : (
        children
      )}
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
