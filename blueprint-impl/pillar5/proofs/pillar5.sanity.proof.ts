import { buildVersionManifest } from "../services/version-manifest.service";
import { buildErrorLog } from "../services/error-log.service";

console.log(buildVersionManifest("1.0.0", 1, "LOCK-PLACEHOLDER"));
console.log(buildErrorLog("boom", "trace_" + Math.random().toString(16).slice(2)));
