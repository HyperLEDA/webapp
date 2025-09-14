import { ReactElement } from "react";

interface LoadingProps {
  message?: string;
  className?: string;
}

export function Loading({
  message = "Loading...",
  className = "",
}: LoadingProps): ReactElement {
  return (
    <div className={`p-8 ${className}`}>
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-300 text-lg">{message}</p>
      </div>
    </div>
  );
}
