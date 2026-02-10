export interface ObsEventInput {
  type: "CRASH" | "ERROR" | "DIAGNOSTIC";
  message: string;
  traceId?: string;
}

export function emitObsEvent(input: ObsEventInput) {
  return {
    type: input.type,
    at: new Date().toISOString(),
    traceId: input.traceId,
    message: input.message,
    meta: { slice: "B" },
  };
}
