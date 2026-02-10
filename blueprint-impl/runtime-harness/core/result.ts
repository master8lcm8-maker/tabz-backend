export type Result<T> =
  | { ok: true; value: T; error?: never; reason?: never }
  | { ok: false; error: string; reason?: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail(error: string, reason?: string): Result<never> {
  return { ok: false, error, reason };
}
