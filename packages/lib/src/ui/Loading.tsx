import { ReactElement } from "react";

interface LoadingProps {
  message?: string;
  className?: string;
  inline?: boolean;
}

function Spinner({ size }: { size: "sm" | "md" }): ReactElement {
  const ring = size === "sm" ? "w-4 h-4 border-2" : "w-8 h-8 border-4";

  return (
    <div className="relative" aria-hidden>
      <div
        className={`${ring} border-border border-t-accent rounded-full animate-spin`}
      />
      <div
        className={`absolute top-0 left-0 ${ring} border-transparent border-t-accent/60 rounded-full animate-spin`}
        style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
      />
    </div>
  );
}

export function Loading({
  message,
  className = "",
  inline = false,
}: LoadingProps): ReactElement {
  const text = message ?? (inline ? undefined : "Loading...");

  if (inline) {
    return (
      <span
        className={`inline-flex items-center justify-center gap-2 ${className}`}
        role="status"
        aria-label={text ?? "Loading"}
      >
        <Spinner size="sm" />
        {text ? (
          <span className="text-subtle font-medium animate-pulse">{text}</span>
        ) : null}
      </span>
    );
  }

  return (
    <div className={`p-8 ${className}`} role="status" aria-label={text ?? "Loading"}>
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Spinner size="md" />
        {text ? (
          <p className="text-subtle text-lg font-medium animate-pulse">{text}</p>
        ) : null}
      </div>
    </div>
  );
}
