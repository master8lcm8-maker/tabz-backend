import type { Result } from "./result";

export async function run<T>(name: string, fn: () => Promise<Result<T>> | Result<T>): Promise<void> {
  try {
    const r = await fn();
    const payload = { name, ok: r.ok, ...(r.ok ? { value: r.value } : { error: r.error, meta: (r as any).meta }) };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload, null, 2));
    process.exit(r.ok ? 0 : 1);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ name, ok: false, error: e?.message ?? String(e) }, null, 2));
    process.exit(1);
  }
}
