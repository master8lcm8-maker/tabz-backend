/**
 * PILLAR 3 — Spotlight Conflict Resolution (Slice A / Add-only)
 * Priority resolution placeholder. No DB, no wiring.
 */
export type SpotlightCandidate = {
  id: number;
  venueId: number;
  priority: number;
  startsAt: string;
  endsAt: string;
};

export class SpotlightConflictService {
  /**
   * Deterministic winner selection:
   * - higher priority wins
   * - tie-break: earliest startsAt
   * - tie-break: lowest id
   */
  resolveWinner(candidates: SpotlightCandidate[]): SpotlightCandidate | null {
    if (!candidates.length) return null;

    return [...candidates].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aStart = Date.parse(a.startsAt);
      const bStart = Date.parse(b.startsAt);
      if (aStart !== bStart) return aStart - bStart;
      return a.id - b.id;
    })[0];
  }
}
