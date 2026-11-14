import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import type { editor, Position } from "monaco-editor";
import { ReactElement } from "react";
import { useTheme } from "@leda/lib/ui";
import { EXPRESSION_TOKENS, type ExpressionToken } from "./expressionTokens";

const LANGUAGE_ID = "hyperleda-expression";

let languageRegistered = false;

function findToken(
  word: string,
  tokens: ExpressionToken[],
): ExpressionToken | undefined {
  return tokens.find((token) => token.label === word);
}

function registerExpressionLanguage(monaco: typeof Monaco): void {
  if (languageRegistered) {
    return;
  }
  monaco.languages.register({ id: LANGUAGE_ID });
  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    keywords: EXPRESSION_TOKENS.map((token) => token.label),
    tokenizer: {
      root: [
        [/"(?:\\.|[^"\\])*"/, "string"],
        [/'[^']*'/, "string"],
        [/\d+(?:\.\d+)?/, "number"],
        [/[+\-*/%=()<>!&|,]/, "delimiter"],
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "identifier",
            },
          },
        ],
      ],
    },
  });
  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: ["(", '"'],
    provideCompletionItems(model: editor.ITextModel, position: Position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: EXPRESSION_TOKENS.map((token) => ({
          label: token.label,
          kind:
            token.kind === "function"
              ? monaco.languages.CompletionItemKind.Function
              : monaco.languages.CompletionItemKind.Constant,
          insertText: token.insert,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: token.detail,
          documentation: token.detail,
          range,
        })),
      };
    },
  });
  monaco.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover(model: editor.ITextModel, position: Position) {
      const word = model.getWordAtPosition(position);
      if (!word) {
        return null;
      }
      const token = findToken(word.word, EXPRESSION_TOKENS);
      if (!token) {
        return null;
      }
      return {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        },
        contents: [{ value: `**${token.label}**` }, { value: token.detail }],
      };
    },
  });
  languageRegistered = true;
}

const EDITOR_HEIGHT_PX = 110;

export function ExpressionEditor({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}): ReactElement {
  const { effectiveTheme } = useTheme();

  return (
    <div className="overflow-hidden rounded border border-border bg-surface-2 focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent">
      <Editor
        height={`${EDITOR_HEIGHT_PX}px`}
        language={LANGUAGE_ID}
        theme={effectiveTheme === "dark" ? "vs-dark" : "light"}
        value={value}
        onChange={(next) => {
          onChange(next ?? "");
        }}
        beforeMount={(monaco) => {
          registerExpressionLanguage(monaco);
        }}
        options={{
          ariaLabel,
          readOnly: disabled,
          minimap: { enabled: false },
          lineNumbers: "off",
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 12,
          lineNumbersMinChars: 0,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          fontSize: 14,
          lineHeight: 22,
          padding: { top: 10, bottom: 10 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          renderLineHighlight: "none",
          scrollbar: {
            vertical: "auto",
            horizontal: "hidden",
            alwaysConsumeMouseWheel: false,
          },
          quickSuggestions: { other: true, comments: false, strings: true },
          wordBasedSuggestions: "off",
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "off",
          tabCompletion: "on",
          automaticLayout: true,
          contextmenu: false,
          fixedOverflowWidgets: true,
        }}
        loading={<div style={{ height: EDITOR_HEIGHT_PX }} />}
      />
    </div>
  );
}
