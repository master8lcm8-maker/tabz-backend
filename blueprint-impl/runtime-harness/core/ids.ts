let seq = 0;
export function nextId(prefix = "ID"): string {
  seq += 1;
  return `${prefix}-${seq}`;
}
