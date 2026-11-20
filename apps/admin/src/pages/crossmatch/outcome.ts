import type { PreviewCrossmatchRow } from "../../clients/admin";

export type CandidateCountLabel = "0" | "1" | ">1";

export type PreviewSkyRow = PreviewCrossmatchRow & {
  status: string;
  triage: string;
};

export function candidateCountLabel(status: string): CandidateCountLabel {
  if (status === "existing") {
    return "1";
  }
  if (status === "colliding") {
    return ">1";
  }
  return "0";
}
