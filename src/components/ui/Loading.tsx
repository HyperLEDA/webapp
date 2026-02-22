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
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="relative">
          <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <div
            className="absolute top-0 left-0 w-8 h-8 border-4 border-transparent border-t-blue-300 rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          ></div>
        </div>
        <p className="text-gray-300 text-lg font-medium animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
