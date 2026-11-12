import classNames from "classnames";
import { ReactElement, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
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

export function Markdown({
  children,
  blocks = false,
}: {
  children: string;
  blocks?: boolean;
}): ReactElement {
  const components: Components = { a: MarkdownLink };
  if (!blocks) {
    components.p = MarkdownParagraph;
  }

  return (
    <div
      className={classNames(
        "prose prose-sm dark:prose-invert max-w-none prose-a:no-underline",
        !blocks && "prose-p:my-0",
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
