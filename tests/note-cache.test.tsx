import { describe, expect, it } from "vitest";
import { cloneNotes, getNotesScopeKey, readCachedNotes } from "../src/lib/noteCache";

describe("BACKLOG-002 노트 목록 캐시 유틸", () => {
  it("전체 노트 scope 키를 고정 문자열로 만든다", () => {
    expect(getNotesScopeKey(undefined)).toBe("__all__");
    expect(getNotesScopeKey(null)).toBe("__all__");
    expect(getNotesScopeKey("group_a")).toBe("group_a");
  });

  it("캐시 읽기 결과는 복제본을 반환한다", () => {
    const cache = new Map([
      ["__all__", [{ id: "n1", title: "t", content: "c", group_id: null, sort_order: 0, updated_at: "x" }]],
    ]);

    const first = readCachedNotes(cache, null);
    const second = readCachedNotes(cache, null);

    expect(first).not.toBe(second);
    expect(first?.[0]).not.toBe(second?.[0]);
    expect(first).toEqual(second);
  });

  it("노트 배열과 객체를 복제한다", () => {
    const original = [
      { id: "n1", title: "제목", content: "본문", group_id: "g1", sort_order: 1, updated_at: "x" },
    ];

    const cloned = cloneNotes(original);

    expect(cloned).not.toBe(original);
    expect(cloned[0]).not.toBe(original[0]);
    expect(cloned).toEqual(original);
  });
});
