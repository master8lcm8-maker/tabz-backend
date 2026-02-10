/**
 * Slice A — Rate limiting skeleton.
 * Returns an outcome based on precomputed counts (no storage).
 */

import { AbuseSignal, AbuseOutcome, AbuseHeuristics } from "./abuse.contracts";

export class RateLimitService {
  evaluate(signal: AbuseSignal): AbuseOutcome {
    const n = signal.recentAttempts ?? 0;
    if (n >= AbuseHeuristics.MAX_ATTEMPTS_PER_WINDOW) return "BLOCK";
    if (n >= Math.floor(AbuseHeuristics.MAX_ATTEMPTS_PER_WINDOW * 0.7)) return "SUSPECT";
    return "ALLOW";
  }
}
