/**
 * Slice A — Anomaly flags skeleton.
 * Produces deterministic flags from precomputed "scores" (to be computed later).
 */

import { AbuseOutcome, AbuseHeuristics } from "./abuse.contracts";

export type AnomalyInput = {
  anomalyScore?: number; // planned
  flags?: string[];      // planned
};

export type AnomalyResult = {
  outcome: AbuseOutcome;
  flags: string[];
  score: number;
};

export class AnomalyFlagsService {
  evaluate(input: AnomalyInput): AnomalyResult {
    const score = input.anomalyScore ?? 0;
    const flags = input.flags ?? [];

    if (score >= AbuseHeuristics.ANOMALY_SCORE_BLOCK) return { outcome: "BLOCK", flags: ["ANOMALY_BLOCK", ...flags], score };
    if (score >= AbuseHeuristics.ANOMALY_SCORE_SUSPECT) return { outcome: "SUSPECT", flags: ["ANOMALY_SUSPECT", ...flags], score };
    return { outcome: "ALLOW", flags, score };
  }
}
