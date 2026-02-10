export interface BuildReproDecision {
  reproducible: boolean;
  lockfilePresent: boolean;
  deterministicStepsDocumented: boolean;
  reason?: string;
}
