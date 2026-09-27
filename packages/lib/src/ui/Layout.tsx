import type { ReactElement, ReactNode } from "react";

export function Layout({
  navbar,
  children,
}: {
  navbar: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="h-full flex overflow-hidden">
      {navbar}
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-8">
        {children}
      </main>
    </div>
  );
}
