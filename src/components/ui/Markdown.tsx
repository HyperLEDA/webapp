import { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "../core/Link";

export function Markdown({ children }: { children: string }): ReactElement {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-a:no-underline prose-p:my-0">
      <ReactMarkdown
        components={{
          a: ({ href, children: linkChildren }) => {
            const url = href ?? "";
            const external = /^https?:\/\//.test(url);
            return (
              <Link href={url} external={external}>
                {linkChildren}
              </Link>
            );
          },
          p: ({ children: paragraphChildren }) => (
            <span>{paragraphChildren as ReactNode}</span>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
