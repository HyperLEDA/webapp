import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const footerContent = `
Information: https://hyperleda.github.io/

Old version: http://leda.univ-lyon1.fr/
`;

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 py-3 border-t bg-[#2a2a2a] border-gray-800 z-10 shadow-lg backdrop-blur-sm bg-opacity-95 mx-8 mb-3 rounded">
      <div className="max-w-4xl mx-auto prose prose-invert leading-none prose-sm px-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {footerContent}
        </ReactMarkdown>
      </div>
    </footer>
  );
}
