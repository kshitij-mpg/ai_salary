/**
 * Evidence confidence from sample size (matching market observations).
 * Used for executive-facing competitor / estimate displays — not raw "n=".
 */

import type { EvidenceConfidence } from "../types";

export type { EvidenceConfidence };

export const CONFIDENCE_LABEL: Record<EvidenceConfidence, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very High",
};

export const CONFIDENCE_TOOLTIP =
  "Confidence represents how many comparable market observations were available for this estimate. More observations generally indicate a more reliable market signal.";

/** Map observation count → confidence tier. */
export function confidenceFromSampleSize(n: number): EvidenceConfidence {
  const count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (count <= 1) return "low";
  if (count <= 5) return "medium";
  if (count <= 15) return "high";
  return "very_high";
}

/** Primary executive line: "Based on 3 matching market records" */
export function evidenceBasedOnLabel(n: number): string {
  const count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const noun = count === 1 ? "record" : "records";
  return `Based on ${count.toLocaleString()} matching market ${noun}`;
}

/** Compact table cell: "3 records" */
export function evidenceRecordCountLabel(n: number): string {
  const count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const noun = count === 1 ? "record" : "records";
  return `${count.toLocaleString()} ${noun}`;
}
