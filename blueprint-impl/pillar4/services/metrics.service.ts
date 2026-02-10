/**
 * PILLAR 4 — Metrics/Tracking Service (Slice A / Add-only)
 * Internal metrics placeholder (no dashboards).
 */
import { P4AttributionEvent } from "../contracts/attribution-tracking.contracts";

export class MetricsService {
  private buffer: P4AttributionEvent[] = [];

  track(event: Omit<P4AttributionEvent, "eventId" | "at">): P4AttributionEvent {
    const evt: P4AttributionEvent = {
      ...event,
      eventId: `m_${Math.random().toString(36).slice(2)}`,
      at: new Date().toISOString(),
    };
    this.buffer.push(evt);
    return evt;
  }

  snapshot(): P4AttributionEvent[] {
    return [...this.buffer];
  }

  clear() {
    this.buffer = [];
  }
}
