export interface ObservabilityEvent {
  type: "CRASH" | "ERROR" | "DIAGNOSTIC";
  at: string;          // ISO timestamp
  traceId?: string;    // correlation id
  message?: string;
  meta?: Record<string, any>;
}
