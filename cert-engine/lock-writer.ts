import fs from "fs";
import path from "path";
import { CertPass } from "./types";

export function writeLock(pillar: string, results: CertPass[]) {
  const dir = path.join(process.cwd(), "locks", pillar);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const file = path.join(dir, `LOCK-${stamp}.json`);

  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );

  return file;
}
