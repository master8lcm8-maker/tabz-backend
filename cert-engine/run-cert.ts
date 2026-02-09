import { loadContract } from "./contract-loader";
import { evaluate } from "./evaluator";
import { writeLock } from "./lock-writer";

import { detectPillar3 } from "./detectors/pillar3.detector";
import { detectPillar4 } from "./detectors/pillar4.detector";
import { detectPillar5 } from "./detectors/pillar5.detector";

async function run() {
  const pillar = process.argv[2];

  if (!pillar) {
    console.error("Usage: ts-node cert-engine/run-cert.ts pillar3|pillar4|pillar5");
    process.exit(1);
  }

  const contract = loadContract(pillar);

  let evidence: any;

  if (pillar === "pillar3") evidence = detectPillar3(process.cwd());
  if (pillar === "pillar4") evidence = detectPillar4(process.cwd());
  if (pillar === "pillar5") evidence = detectPillar5(process.cwd());

  const results = evaluate(contract, evidence);

  const failed = results.filter(r => !r.passed);

  if (failed.length) {
    console.log("\nFAILED:\n");
    for (const f of failed) console.log("-", f.id);
    process.exit(1);
  }

  const file = writeLock(pillar, results);

  console.log("\nALL GREEN");
  console.log("Lock:", file);
}

run();
