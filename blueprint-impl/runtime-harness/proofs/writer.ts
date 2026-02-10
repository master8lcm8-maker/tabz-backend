import * as fs from "fs";
import * as path from "path";

export function writeProof(relPath: string, contents: string): string {
  const out = path.resolve(process.cwd(), relPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, contents, { encoding: "utf8" });
  return out;
}
