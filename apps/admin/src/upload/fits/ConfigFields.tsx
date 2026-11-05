import { ReactElement } from "react";

import type { FitsConfig } from "./parser";

const controlClassName =
  "bg-surface-2 border border-border rounded px-2 py-1 text-primary w-full min-w-0 text-sm";

interface FitsConfigFieldsProps {
  config: FitsConfig;
  disabled?: boolean;
  onChange: (config: FitsConfig) => void;
}

export function FitsConfigFields({
  config,
  disabled = false,
  onChange,
}: FitsConfigFieldsProps): ReactElement {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-sm font-semibold text-muted">HDU index</span>
      <input
        className={controlClassName}
        type="number"
        min={0}
        step={1}
        value={config.hduIndex}
        disabled={disabled}
        onChange={(event) =>
          onChange({
            hduIndex: Math.max(0, Math.floor(Number(event.target.value) || 0)),
          })
        }
      />
    </label>
  );
}
