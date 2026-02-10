export interface TraceStep {
  name: string;
  at: string;
  data?: any;
}

export interface Trace {
  name: string;
  steps: TraceStep[];
  step: (name: string, data?: any) => void;
}

export function newTrace(name: string): Trace {
  const steps: TraceStep[] = [];
  return {
    name,
    steps,
    step(name: string, data?: any) {
      steps.push({ name, at: new Date().toISOString(), data });
    },
  };
}
