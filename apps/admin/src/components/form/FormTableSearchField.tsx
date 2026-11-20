import { ReactElement } from "react";
import { TableSearchInput } from "../TableSearchInput";
import { useFormBusy } from "./Form";
import { FormField } from "./FormField";

export function FormTableSearchField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}): ReactElement {
  const busy = useFormBusy();
  return (
    <FormField kind="custom" label={label}>
      <TableSearchInput
        value={value}
        onChange={onChange}
        disabled={busy || disabled}
      />
    </FormField>
  );
}
