import { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "@leda/lib/ui";

function MarkdownLink({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}): ReactElement {
  const url = href ?? "";
  const external = /^https?:\/\//.test(url);
  return (
    <Link href={url} external={external}>
      {children}
    </Link>
  );
}

function MarkdownParagraph({
  children,
}: {
  children?: ReactNode;
}): ReactElement {
  return <span>{children}</span>;
}

export function Markdown({ children }: { children: string }): ReactElement {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-a:no-underline prose-p:my-0">
      <ReactMarkdown
        components={{
          a: MarkdownLink,
          p: MarkdownParagraph,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
