import classNames from "classnames";
import React, { ReactElement, ReactNode } from "react";
import { useAnchoredElement } from "../../hooks/useAnchoredElement";
import { CardActionsMenu, CardAction } from "./CardActionsMenu";
import { CardAnchorLink } from "./CardAnchorLink";

export type { CardAction };

function groupFieldsByColumn(
  fields: ReactNode[],
  columnCount: number,
): ReactNode[][] {
  const columns: ReactNode[][] = Array.from({ length: columnCount }, () => []);
  const fieldsPerColumn = Math.ceil(fields.length / columnCount);
  fields.forEach((field, index) => {
    columns[Math.floor(index / fieldsPerColumn)].push(field);
  });
  return columns;
}

function FieldsColumnGroup({
  fields,
  columnCount,
  className,
}: {
  fields: ReactNode[];
  columnCount: number;
  className?: string;
}): ReactElement {
  const columns = groupFieldsByColumn(fields, columnCount);

  return (
    <div
      className={classNames(
        "grid w-full items-start divide-x divide-border",
        columnCount === 2 && "grid-cols-2",
        columnCount === 3 && "grid-cols-3",
        className,
      )}
    >
      {columns.map((columnFields, index) => (
        <dl
          key={index}
          className={classNames(
            "grid min-w-0 grid-cols-[auto_1fr] content-start gap-x-3 gap-y-0.5 self-start",
            index === 0
              ? "pr-4"
              : index === columns.length - 1
                ? "pl-4"
                : "px-4",
          )}
        >
          {columnFields}
        </dl>
      ))}
    </div>
  );
}

function ResponsiveFieldsBody({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const fields = React.Children.toArray(children);

  return (
    <>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-base md:hidden">
        {fields}
      </dl>
      <FieldsColumnGroup
        fields={fields}
        columnCount={2}
        className="hidden text-base md:grid xl:hidden"
      />
      <FieldsColumnGroup
        fields={fields}
        columnCount={3}
        className="hidden text-base xl:grid"
      />
    </>
  );
}

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
        <ResponsiveFieldsBody>{children}</ResponsiveFieldsBody>
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
