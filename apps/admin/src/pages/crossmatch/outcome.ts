import type { PreviewCrossmatchRow } from "../../clients/admin";

export type CrossmatchOutcomeLabel = "new" | "existing" | "pending";

export function crossmatchOutcomeLabel(
  row: PreviewCrossmatchRow,
): CrossmatchOutcomeLabel {
  if (row.triage === "pending" || row.status === "colliding") {
    return "pending";
  }
  if (row.status === "existing") {
    return "existing";
  }
  return "new";
}
