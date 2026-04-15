export type PerfSampleKind = "group-switch" | "note-open";

export type PerfSample = {
  id: string;
  kind: PerfSampleKind;
  label: string;
  durationMs: number;
  summary: string;
  measuredAt: string;
};

export function appendPerfSample(
  samples: PerfSample[],
  sample: PerfSample,
  maxEntries = 6
) {
  return [sample, ...samples].slice(0, maxEntries);
}

export function formatPerfDuration(durationMs: number) {
  return `${Math.round(durationMs)}ms`;
}

export function buildPerfConsoleLine(sample: PerfSample) {
  return `[perf][${sample.kind}] ${sample.label} ${formatPerfDuration(sample.durationMs)} · ${sample.summary}`;
}
