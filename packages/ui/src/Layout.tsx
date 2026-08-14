import type { ReactElement, ReactNode } from "react";

export function Layout({
  navbar,
  children,
}: {
  navbar: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="min-h-screen flex">
      {navbar}
      <div className="ml-12 flex flex-col flex-grow min-h-screen">
        <div className="flex-grow p-8">{children}</div>
      </div>
    </div>
  );
}
