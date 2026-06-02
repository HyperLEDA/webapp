import classNames from "classnames";
import { ReactElement, ReactNode } from "react";
import { useAnchoredElement } from "../../hooks/useAnchoredElement";
import { CardActionsMenu, CardAction } from "./CardActionsMenu";
import { CardAnchorLink } from "./CardAnchorLink";

export type { CardAction };

export function Card({
  title,
  children,
  actions,
  headerControls,
  afterChildren,
  anchorId,
  className,
  variant = "fields",
}: {
  title: ReactNode;
  children: ReactNode;
  actions?: CardAction[];
  headerControls?: ReactNode;
  afterChildren?: ReactNode;
  anchorId?: string;
  className?: string;
  variant?: "fields" | "responsive-fields" | "block";
}): ReactElement {
  const { ref, highlighted } = useAnchoredElement(anchorId ?? "");
  const cardActions = actions ?? [];
  const hasActions = cardActions.length > 0;
  const hasHeaderControls =
    hasActions || Boolean(headerControls) || Boolean(anchorId);

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
          hasHeaderControls
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
            {headerControls}
            {hasActions ? <CardActionsMenu actions={cardActions} /> : null}
          </div>
        ) : null}
      </div>
      {variant === "fields" ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-base">
          {children}
        </dl>
      ) : variant === "responsive-fields" ? (
        <dl
          className={classNames(
            "grid gap-x-3 gap-y-0.5 text-base",
            "grid-cols-[auto_1fr]",
            "md:grid-cols-[auto_1fr_auto_1fr]",
            "xl:grid-cols-[auto_1fr_auto_1fr_auto_1fr]",
          )}
        >
          {children}
        </dl>
      ) : (
        children
      )}
      {afterChildren}
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
      <dt className="text-muted shrink-0">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}
