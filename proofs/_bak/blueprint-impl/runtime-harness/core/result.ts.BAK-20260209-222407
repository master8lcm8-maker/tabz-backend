export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; meta?: any };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(error: string, meta?: any): Result<T> {
  return { ok: false, error, meta };
}
