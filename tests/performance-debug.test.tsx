import { describe, expect, it } from "vitest";
import {
  appendPerfSample,
  buildPerfConsoleLine,
  formatPerfDuration,
  type PerfSample,
} from "../src/lib/performanceDebug";

function createSample(id: string, durationMs: number): PerfSample {
  return {
    id,
    kind: "group-switch",
    label: `sample-${id}`,
    durationMs,
    summary: "3개 노트 렌더",
    measuredAt: "2026-04-15T00:00:00.000Z",
  };
}

describe("BACKLOG-002 성능 계측 유틸", () => {
  it("최근 샘플이 앞에 오고 최대 개수를 유지한다", () => {
    const first = createSample("1", 101);
    const second = createSample("2", 202);
    const third = createSample("3", 303);

    const result = appendPerfSample(
      appendPerfSample([first, second], third, 2),
      createSample("4", 404),
      2
    );

    expect(result.map((sample) => sample.id)).toEqual(["4", "3"]);
  });

  it("표시용 시간을 밀리초 문자열로 반올림한다", () => {
    expect(formatPerfDuration(99.4)).toBe("99ms");
    expect(formatPerfDuration(99.6)).toBe("100ms");
  });

  it("콘솔 출력용 라인을 일관되게 만든다", () => {
    const sample = {
      ...createSample("5", 145),
      kind: "note-open" as const,
      label: "회의록",
      summary: "본문 1200자 렌더",
    };

    expect(buildPerfConsoleLine(sample)).toBe(
      "[perf][note-open] 회의록 145ms · 본문 1200자 렌더"
    );
  });
});
