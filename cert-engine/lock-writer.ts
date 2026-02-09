import fs from "fs";
import path from "path";
import { CertPass } from "./types";

export type LockType = "BLUEPRINT_LOCK" | "FEATURE_LOCK";

export function writeLock(
  pillar: string,
  results: CertPass[],
  lockType: LockType = "BLUEPRINT_LOCK",
) {
  const dir = path.join(process.cwd(), "locks", pillar);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `LOCK-${stamp}.json`);

  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        pillar,
        lockType,
        results,
      },
      null,
      2,
    ),
  );

  return file;
}
