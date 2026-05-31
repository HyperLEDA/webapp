import classNames from "classnames";
import { Children, ReactElement, ReactNode, useState } from "react";
import { MdCode, MdKeyboardArrowDown } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { SqlQueryEmbed } from "../catalog/SqlQueryEmbed";
import { Button } from "../core/Button";
import { AppTooltip } from "../ui/AppTooltip";
import { Card, CardAction, Field } from "../ui/Card";
import { originalDataCatalogLink } from "./catalogActions";

export type { CardAction as CatalogCardAction };
export { Field };

export function getSourceLink(bibcode: string): string {
  return `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`;
}

export function bibcodeMarkdownSelect(): string {
  return `'[' || bib.code || '](https://ui.adsabs.harvard.edu/abs/' || bib.code || '/abstract)' AS bibcode`;
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
  actions?: CardAction[];
  originalDataSql?: string;
  anchorId?: string;
  className?: string;
  variant?: "fields" | "block";
}): ReactElement {
  const navigate = useNavigate();
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

  const headerControls = originalDataSql ? (
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
  ) : null;

  const afterChildren =
    originalDataSql && originalDataMounted ? (
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
            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
              <SqlQueryEmbed key={originalDataSql} sql={originalDataSql} />
              <div className="flex justify-end">
                <AppTooltip content="Open in data catalog">
                  <Button
                    type="button"
                    className="!p-1.5 cursor-pointer"
                    onClick={() =>
                      navigate(originalDataCatalogLink(originalDataSql))
                    }
                    aria-label="Open in data catalog"
                  >
                    <MdCode className="size-5 text-muted" aria-hidden />
                  </Button>
                </AppTooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <Card
      title={title}
      actions={actions}
      headerControls={headerControls}
      afterChildren={afterChildren}
      anchorId={anchorId}
      className={className}
      variant={variant}
    >
      {children}
    </Card>
  );
}

export function CatalogNoData(): ReactElement {
  return <p className="col-span-2 text-muted text-base">No data available.</p>;
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
