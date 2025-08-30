import { useState } from "react";
import { Link as ReactDomLink } from "react-router-dom";
import { Button } from "./button";
import { Link } from "./link";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";

const footerContent = (
  <div className="prose prose-invert prose-a:no-underline">
    <div>
      Information: <Link href="https://hyperleda.github.io/" />
    </div>
    <div>
      Old version: <Link href="http://leda.univ-lyon1.fr/" />
    </div>
  </div>
);

export function Footer() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  function toggleCollapse() {
    setIsCollapsed(!isCollapsed);
  }

  return (
    <>
      <Button
        onClick={toggleCollapse}
        className={`fixed bottom-4 right-4 z-10 transition-all duration-100 ease-in-out ${
          isCollapsed
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        aria-label="Expand footer"
      >
        <MdKeyboardArrowUp />
      </Button>

      <footer
        className={`fixed bottom-0 border-1 left-0 right-0 py-3 z-10 shadow-lg backdrop-blur-sm bg-opacity-99 mx-10 mb-3 rounded transition-all duration-300 ease-in-out ${
          isCollapsed
            ? "opacity-0 translate-y-full pointer-events-none"
            : "opacity-100 translate-y-0"
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="max-w-4xl w-full mx-auto leading-none prose-sm">
            <div className="flex items-center gap-4">
              <ReactDomLink to="/">
                <img src="/logo.png" alt="HyperLeda Logo" className="h-8" />
              </ReactDomLink>
              {footerContent}
            </div>
          </div>
          <Button onClick={toggleCollapse} className="mr-3">
            <MdKeyboardArrowDown />
          </Button>
        </div>
      </footer>
    </>
  );
}
