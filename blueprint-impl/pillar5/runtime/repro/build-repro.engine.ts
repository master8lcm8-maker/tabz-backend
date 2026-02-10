export interface BuildReproInput {
  lockfilePresent: boolean;
  deterministicStepsDocumented: boolean;
}

export interface BuildReproResult {
  reproducible: boolean;
  reason: string;
}

export function evaluateBuildRepro(input: BuildReproInput): BuildReproResult {
  const ok = !!input.lockfilePresent && !!input.deterministicStepsDocumented;
  return { reproducible: ok, reason: ok ? "SLICE_B_REPRO_OK" : "SLICE_B_REPRO_FAIL" };
}
