import { run } from "../../runtime-harness/core/runner";
import { ok } from "../../runtime-harness/core/result";
import { nowIso } from "../../runtime-harness/core/clock";
import { newTrace } from "../../runtime-harness/core/trace";

import { buildReleaseManifest } from "../runtime/release/release-manifest.engine";
import { evaluateSigningReadiness } from "../runtime/signing/signing.engine";
import { evaluateBuildRepro } from "../runtime/repro/build-repro.engine";
import { emitObsEvent } from "../runtime/observability/observability.engine";

export async function pillar5SliceBSim() {
  const trace = newTrace("pillar5-sliceB");

  const manifest = buildReleaseManifest({ semver: "0.0.1", buildNumber: 1, gitTag: "SLICE-B-DEMO" });
  const signing = evaluateSigningReadiness({ iosProfilePresent: true, androidKeystorePresent: false });
  const repro = evaluateBuildRepro({ lockfilePresent: true, deterministicStepsDocumented: true });
  const obs = emitObsEvent({ type: "DIAGNOSTIC", message: "sliceB smoke", traceId: "trace-demo" });

  trace.step("manifest", manifest);
  trace.step("signing", signing);
  trace.step("repro", repro);
  trace.step("obs", obs);

  return ok({ at: nowIso(), manifest, signing, repro, obs, trace });
}

if (require.main === module) {
  run("pillar5.sliceB", pillar5SliceBSim);
}
