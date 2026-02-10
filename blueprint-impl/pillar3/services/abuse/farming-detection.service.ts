/**
 * Slice A — Farming detection skeleton.
 * Flags likely farming patterns based on burst behavior (precomputed counts).
 */

import { AbuseSignal, AbuseOutcome, AbuseHeuristics } from "./abuse.contracts";

export class FarmingDetectionService {
  evaluate(signal: AbuseSignal): AbuseOutcome {
    const n = signal.recentAttempts ?? 0;
    if (n >= AbuseHeuristics.FARMING_BURST_THRESHOLD) return "SUSPECT";
    return "ALLOW";
  }
}
