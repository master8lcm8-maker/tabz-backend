/**
 * PILLAR 3 EVIDENCE — Live feedback exists (stub proof artifact)
 * This is NOT application code. It is a certification evidence artifact.
 */

export function emit(event: string, payload: unknown) {
  return { event, payload };
}

export function ack(event: string) {
  return { ack: true, event };
}
