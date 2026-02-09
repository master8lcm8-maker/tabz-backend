import { CertPass } from "./types";

function flatten(obj: any, prefix = ""): Record<string, boolean> {
  let out: Record<string, boolean> = {};

  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const id = prefix ? `${prefix}.${k}` : k;

    if (typeof val === "boolean") {
      out[id] = val;
    } else if (typeof val === "object") {
      Object.assign(out, flatten(val, id));
    }
  }

  return out;
}

export function evaluate(contract: any, evidence: any): CertPass[] {
  const c = flatten(contract);
  const e = flatten(evidence);

  const results: CertPass[] = [];

  for (const id of Object.keys(c)) {
    if (id === "pillar") continue;

    results.push({
      id,
      expected: true,
      actual: !!e[id],
      passed: !!e[id],
    });
  }

  return results;
}
