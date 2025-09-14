import { ReactElement, ReactNode } from "react";
import { Button } from "./button";

interface ErrorPageProps {
  title: string;
  message: string;
  children?: ReactNode;
  className?: string;
  showLargeText?: boolean;
}

export function ErrorPage({
  title,
  message,
  children,
  className = "",
  showLargeText = false,
}: ErrorPageProps): ReactElement {
  return (
    <div
      className={`min-h-screen flex items-center justify-center ${className}`}
    >
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          {showLargeText && <h1 className="text-9xl font-bold">404</h1>}
          <h2 className="text-2xl font-semibold mb-4">{title}</h2>
          <p className="text-gray-400 mb-8">{message}</p>
        </div>

        {children && (
          <div className="flex justify-center gap-4">{children}</div>
        )}
      </div>
    </div>
  );
}

export function ErrorPageBackButton({
  onClick,
}: {
  onClick: () => void;
}): ReactElement {
  return (
    <Button onClick={onClick} className="px-6 py-3 text-base">
      Back
    </Button>
  );
}

export function ErrorPageHomeButton({
  onClick,
}: {
  onClick: () => void;
}): ReactElement {
  return (
    <Button onClick={onClick} className="px-6 py-3 text-base">
        Home
    </Button>
  );
}
