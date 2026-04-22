import { describe, expect, it } from "vitest";
import type { Group, Note } from "../src/lib/api";
import {
  deriveNotesPageState,
  getCurrentGroupLabel,
  getGroupListStatusLabel,
  getNoteListStatusLabel,
  getPanelVisibility,
  getSaveLabel,
  matchesNoteSearch,
} from "../src/pages/notesPageDerivations";

const groups: Group[] = [
  { id: "g1", name: "Work", position: 0 },
  { id: "g2", name: "Personal", position: 1 },
];

const notes: Note[] = [
  {
    id: "n1",
    title: "Sprint Plan",
    content: "Ship search improvements",
    group_id: "g1",
    sort_order: 0,
    updated_at: "2026-04-22T00:00:00.000Z",
  },
  {
    id: "n2",
    title: "Travel",
    content: "Book Seoul hotel",
    group_id: "g2",
    sort_order: 1,
    updated_at: "2026-04-22T00:00:00.000Z",
  },
];

describe("NOTES-PAGE derived state", () => {
  it("matches search text against both title and content without case sensitivity", () => {
    expect(matchesNoteSearch(notes[0], "sprint")).toBe(true);
    expect(matchesNoteSearch(notes[1], "seoul")).toBe(true);
    expect(matchesNoteSearch(notes[1], "missing")).toBe(false);
  });

  it("filters notes and switches the status label to search results when search is active", () => {
    const derived = deriveNotesPageState({
      groups,
      notes,
      searchQuery: "  SEOUL ",
      saveStatus: "saved",
      groupReorderStatus: "idle",
      noteReorderStatus: "idle",
      notesLoadState: "ready",
      selectedGroupId: null,
      isMobile: false,
      mobilePanel: "groups",
    });

    expect(derived.isSearchActive).toBe(true);
    expect(derived.filteredNotes.map((note) => note.id)).toEqual(["n2"]);
    expect(derived.effectiveNoteListStatusLabel).toBe("1개 검색 결과");
  });

  it("keeps all desktop panels visible and shows only the active mobile panel", () => {
    expect(getPanelVisibility(false, "groups")).toEqual({
      showGroupsPanel: true,
      showNotesPanel: true,
      showEditorPanel: true,
    });
    expect(getPanelVisibility(true, "notes")).toEqual({
      showGroupsPanel: false,
      showNotesPanel: true,
      showEditorPanel: false,
    });
  });

  it("resolves labels for save status, group reorder status, and note list status", () => {
    expect(getSaveLabel("conflict")).toBe("충돌 발생");
    expect(getGroupListStatusLabel("saving", groups.length)).toBe("그룹 정렬 저장 중...");
    expect(getNoteListStatusLabel({
      noteReorderStatus: "idle",
      notesLoadState: "refreshing",
      selectedGroupId: null,
    })).toBe("목록 백그라운드 갱신 중...");
  });

  it("returns the selected group name and falls back when the group is missing", () => {
    expect(getCurrentGroupLabel(groups, "g2")).toBe("Personal");
    expect(getCurrentGroupLabel(groups, "missing")).toBe("그룹");
    expect(getCurrentGroupLabel(groups, null)).toBe("전체 노트");
  });
});
