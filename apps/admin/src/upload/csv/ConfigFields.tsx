import { ReactElement } from "react";

import type { CsvConfig } from "./parser";

const controlClassName =
  "bg-surface-2 border border-border rounded px-2 py-1 text-primary w-full min-w-0 text-sm";

function unescapeSeparator(value: string): string {
  return value.replace(/\\t/g, "\t").replace(/\\n/g, "\n");
}

interface CsvConfigFieldsProps {
  config: CsvConfig;
  disabled?: boolean;
  onChange: (config: CsvConfig) => void;
}

export function CsvConfigFields({
  config,
  disabled = false,
  onChange,
}: CsvConfigFieldsProps): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-semibold text-muted">Separator</span>
        <input
          className={controlClassName}
          value={config.separator === "\t" ? "\\t" : config.separator}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...config,
              separator: unescapeSeparator(event.target.value),
            })
          }
        />
      </label>
      <label className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-semibold text-muted">Skip lines</span>
        <input
          className={controlClassName}
          type="number"
          min={0}
          value={config.skipLines}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...config,
              skipLines: Math.max(0, Number(event.target.value) || 0),
            })
          }
        />
      </label>
    </div>
  );
}
