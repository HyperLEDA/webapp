import { ReactElement } from "react";
import { Catalogs, NoteEntry } from "../../clients/backend/types.gen";
import { Link } from "../core/Link";
import { Hint } from "../ui/Hint";
import { CatalogCard, Field, getSourceLink } from "./CatalogCard";

function renderNoteSourceHint(note: NoteEntry): string {
  const source = note.source;
  const authors = source.authors.join(", ");

  return `${source.title} — ${authors} (${source.year})`;
}

export function NotesCard({
  catalogs,
}: {
  catalogs: Catalogs;
}): ReactElement | null {
  const notes = catalogs.notes;
  if (!notes?.length) return null;

  return (
    <CatalogCard title="Notes" anchorId="notes">
      {notes.map((note, i) => (
        <Field
          key={`${note.source.bibcode}-${i}`}
          label={
            <Hint hintContent={renderNoteSourceHint(note)} trigger="child">
              <Link href={getSourceLink(note.source.bibcode)} external>
                {note.source.bibcode}
              </Link>
            </Hint>
          }
        >
          <span className="whitespace-pre-wrap">{note.note}</span>
        </Field>
      ))}
    </CatalogCard>
  );
}
