import { describe, expect, it } from "vitest";
import { mergeGroupOrderIntoAllNotes, moveItem } from "../src/lib/noteOrder";

describe("BACKLOG-001 노트 정렬 유틸", () => {
  it("배열 항목을 원하는 위치로 이동한다", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("그룹 노트 순서만 전체 순서 슬롯에 다시 끼운다", () => {
    const allNotes = [
      { id: "a", title: "A", content: "", group_id: "g1", sort_order: 0, updated_at: "x" },
      { id: "b", title: "B", content: "", group_id: "g2", sort_order: 1, updated_at: "x" },
      { id: "c", title: "C", content: "", group_id: "g1", sort_order: 2, updated_at: "x" },
      { id: "d", title: "D", content: "", group_id: "g3", sort_order: 3, updated_at: "x" },
    ];

    const reorderedGroupNotes = [
      { ...allNotes[2] },
      { ...allNotes[0] },
    ];

    const nextAllNotes = mergeGroupOrderIntoAllNotes(allNotes, "g1", reorderedGroupNotes);

    expect(nextAllNotes.map((note) => note.id)).toEqual(["c", "b", "a", "d"]);
  });

  it("그룹 집합이 다르면 에러를 던진다", () => {
    const allNotes = [
      { id: "a", title: "A", content: "", group_id: "g1", sort_order: 0, updated_at: "x" },
      { id: "b", title: "B", content: "", group_id: "g2", sort_order: 1, updated_at: "x" },
    ];

    expect(() => mergeGroupOrderIntoAllNotes(allNotes, "g1", [])).toThrowError();
  });
});
