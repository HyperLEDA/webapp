import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "./button";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";

const footerContent = `
Information: https://hyperleda.github.io/

Old version: http://leda.univ-lyon1.fr/
`;

export function Footer() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {isCollapsed ? (
        <Button
          onClick={toggleCollapse}
          className="fixed bottom-4 right-4 z-10 transition-colors"
          aria-label="Expand footer"
        >
          <MdKeyboardArrowUp />
        </Button>
      ) : (
        <footer className="fixed bottom-0 left-0 right-0 py-3 border-t bg-[#2a2a2a] border-gray-800 z-10 shadow-lg backdrop-blur-sm bg-opacity-95 mx-8 mb-3 rounded transition-all">
          <div className="flex justify-between items-start">
            <div className="max-w-4xl w-full mx-auto leading-none prose-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {footerContent}
              </ReactMarkdown>
            </div>
            <Button onClick={toggleCollapse} className="mr-3">
              <MdKeyboardArrowDown />
            </Button>
          </div>
        </footer>
      )}
    </>
  );
}
