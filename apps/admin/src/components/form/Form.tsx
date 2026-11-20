import classNames from "classnames";
import {
  createContext,
  ReactElement,
  ReactNode,
  SubmitEvent,
  useContext,
  useEffect,
} from "react";
import {
  clearFormDraft,
  DRAFT_SAVE_DEBOUNCE_MS,
  writeFormDraft,
} from "./draft";

const FormBusyContext = createContext(false);

export function useFormBusy(): boolean {
  return useContext(FormBusyContext);
}

interface FormProps<T> {
  fields: ReactNode[];
  actions?: ReactNode;
  busy?: boolean;
  error?: string | null;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  className?: string;
  draftKey: string;
  draftValue: T;
  isEmptyDraft: (value: T) => boolean;
  draftEnabled?: boolean;
}

export function Form<T>({
  fields,
  actions,
  busy = false,
  error = null,
  onSubmit,
  className,
  draftKey,
  draftValue,
  isEmptyDraft,
  draftEnabled = true,
}: FormProps<T>): ReactElement {
  const serializedDraft = JSON.stringify(draftValue);

  useEffect(() => {
    if (!draftEnabled) {
      return;
    }
    const timer = window.setTimeout(() => {
      // SAFETY: serializedDraft is JSON.stringify of the caller's draft value.
      const parsed = JSON.parse(serializedDraft) as T;
      if (isEmptyDraft(parsed)) {
        clearFormDraft(draftKey);
        return;
      }
      writeFormDraft(draftKey, parsed);
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draftEnabled, draftKey, isEmptyDraft, serializedDraft]);

  return (
    <FormBusyContext.Provider value={busy}>
      <form
        onSubmit={onSubmit}
        className={classNames("space-y-5 min-w-0 w-full", className)}
      >
        {fields}
        {actions}
        {error ? (
          <p className="text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </FormBusyContext.Provider>
  );
}
