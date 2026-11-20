import { ReactElement, ReactNode, useId } from "react";
import { useFormBusy } from "./Form";

export const formControlClassName =
  "w-full bg-surface-2 border border-border rounded px-3 py-2 text-primary";

interface FormFieldBase {
  label: string;
  id?: string;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
}

interface TextFormField extends FormFieldBase {
  kind: "text";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: "decimal" | "numeric" | "text";
  lang?: string;
}

interface NumberFormField extends FormFieldBase {
  kind: "number";
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string | number;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFormField extends FormFieldBase {
  kind: "select";
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

interface CheckboxFormField extends FormFieldBase {
  kind: "checkbox";
  checked: boolean;
  onChange: (checked: boolean) => void;
}

interface CustomFormField extends FormFieldBase {
  kind: "custom";
  children: ReactNode;
  optional?: boolean;
}

export type FormFieldProps =
  | TextFormField
  | NumberFormField
  | SelectFormField
  | CheckboxFormField
  | CustomFormField;

function FieldMessage({
  hint,
  error,
}: {
  hint?: string;
  error?: string | null;
}): ReactElement | null {
  if (error) {
    return (
      <p className="text-xs text-danger mt-1" role="alert">
        {error}
      </p>
    );
  }
  if (!hint) {
    return null;
  }
  return <p className="text-xs text-muted mt-1">{hint}</p>;
}

function FieldLabel({
  inputId,
  label,
  optional = false,
}: {
  inputId?: string;
  label: string;
  optional?: boolean;
}): ReactElement {
  return (
    <label htmlFor={inputId} className="block mb-1 text-subtle">
      {label}
      {optional ? <span className="text-muted"> (optional)</span> : null}
    </label>
  );
}

export function FormField(props: FormFieldProps): ReactElement {
  const generatedId = useId();
  const busy = useFormBusy();
  const inputId = props.id ?? generatedId;
  const isDisabled = busy || props.disabled;

  if (props.kind === "checkbox") {
    return (
      <div>
        <div className="flex items-center gap-2">
          <input
            id={inputId}
            type="checkbox"
            checked={props.checked}
            disabled={isDisabled}
            onChange={(event) => {
              props.onChange(event.target.checked);
            }}
            className="rounded border-border"
          />
          <label htmlFor={inputId} className="text-subtle">
            {props.label}
          </label>
        </div>
        <FieldMessage hint={props.hint} error={props.error} />
      </div>
    );
  }

  if (props.kind === "custom") {
    return (
      <div>
        <FieldLabel
          inputId={props.id}
          label={props.label}
          optional={props.optional}
        />
        {props.children}
        <FieldMessage hint={props.hint} error={props.error} />
      </div>
    );
  }

  if (props.kind === "select") {
    return (
      <div>
        <FieldLabel inputId={inputId} label={props.label} />
        <select
          id={inputId}
          value={props.value}
          disabled={isDisabled}
          onChange={(event) => {
            props.onChange(event.target.value);
          }}
          className={formControlClassName}
        >
          <option value="">{props.placeholder ?? "Select…"}</option>
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldMessage hint={props.hint} error={props.error} />
      </div>
    );
  }

  if (props.kind === "number") {
    return (
      <div>
        <FieldLabel inputId={inputId} label={props.label} />
        <input
          id={inputId}
          type="number"
          min={props.min}
          max={props.max}
          step={props.step}
          required={props.required}
          value={props.value}
          disabled={isDisabled}
          onChange={(event) => {
            props.onChange(event.target.value);
          }}
          className={formControlClassName}
        />
        <FieldMessage hint={props.hint} error={props.error} />
      </div>
    );
  }

  return (
    <div>
      <FieldLabel inputId={inputId} label={props.label} />
      <input
        id={inputId}
        type="text"
        value={props.value}
        disabled={isDisabled}
        required={props.required}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        lang={props.lang}
        onChange={(event) => {
          props.onChange(event.target.value);
        }}
        className={formControlClassName}
      />
      <FieldMessage hint={props.hint} error={props.error} />
    </div>
  );
}
