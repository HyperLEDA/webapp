import type { PreviewCrossmatchRow } from "../../clients/admin";

export type CrossmatchOutcomeLabel = "new" | "existing" | "pending";

export type PreviewSkyRow = PreviewCrossmatchRow & {
  status: string;
  triage: string;
};

export function crossmatchOutcomeLabel(row: {
  status: string;
  triage: string;
}): CrossmatchOutcomeLabel {
  if (row.triage === "pending" || row.status === "colliding") {
    return "pending";
  }
  if (row.status === "existing") {
    return "existing";
  }
  return "new";
}
