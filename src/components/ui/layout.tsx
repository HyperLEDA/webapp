import { Footer } from "./footer";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow p-8">{children}</div>
      <Footer />
    </div>
  );
}
