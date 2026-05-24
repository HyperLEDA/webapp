import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import type { TapSchemaEntry } from "../../clients/backend/types.gen";
import { useTheme } from "../../hooks/useTheme";

type CatalogCompletionTemplate = Omit<Monaco.languages.CompletionItem, "range">;

function buildCompletionItems(
  monaco: typeof Monaco,
  schemas: TapSchemaEntry[] | undefined,
): CatalogCompletionTemplate[] {
  const items: CatalogCompletionTemplate[] = [];
  for (const schema of schemas ?? []) {
    for (const table of schema.tables) {
      items.push({
        label: table.name,
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: table.name,
        detail: schema.schema_name,
        documentation: table.description ?? undefined,
      });
      for (const column of table.columns ?? []) {
        items.push({
          label: column.name,
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: column.name,
          detail: `${table.name}.${column.name}`,
          documentation: column.description ?? column.datatype,
        });
      }
    }
  }
  return items;
}

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  schemas?: TapSchemaEntry[];
  disabled?: boolean;
  height?: string;
  onRunQuery?: () => void;
}

export function SqlEditor({
  value,
  onChange,
  schemas,
  disabled = false,
  height = "280px",
  onRunQuery,
}: SqlEditorProps): ReactElement {
  const { effectiveTheme } = useTheme();
  const monacoRef = useRef<typeof Monaco | null>(null);
  const providerRef = useRef<Monaco.IDisposable | null>(null);
  const onRunQueryRef = useRef(onRunQuery);
  const [editorReady, setEditorReady] = useState(false);

  onRunQueryRef.current = onRunQuery;

  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco && editorReady) {
      providerRef.current?.dispose();
      const catalogItems = buildCompletionItems(monaco, schemas);

      providerRef.current = monaco.languages.registerCompletionItemProvider(
        "sql",
        {
          triggerCharacters: [" ", ".", ",", "("],
          provideCompletionItems: (
            model: Monaco.editor.ITextModel,
            position: Monaco.Position,
          ) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            const prefix = word.word.toLowerCase();
            const suggestions = catalogItems
              .filter(
                (item) =>
                  !prefix ||
                  String(item.label).toLowerCase().startsWith(prefix),
              )
              .map((item) => ({ ...item, range }));

            return { suggestions };
          },
        },
      );
    }

    return () => {
      providerRef.current?.dispose();
      providerRef.current = null;
    };
  }, [schemas, editorReady]);

  const editorOptions = useMemo(
    () => ({
      readOnly: disabled,
      minimap: { enabled: false },
      fontSize: 14,
      scrollBeyondLastLine: false,
      wordWrap: "on" as const,
      automaticLayout: true,
      tabSize: 2,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
    }),
    [disabled],
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Editor
        height={height}
        language="sql"
        theme={effectiveTheme === "dark" ? "vs-dark" : "vs"}
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onMount={(editor, monaco) => {
          monacoRef.current = monaco;
          setEditorReady(true);
          editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            () => {
              onRunQueryRef.current?.();
            },
          );
        }}
        options={editorOptions}
      />
    </div>
  );
}
