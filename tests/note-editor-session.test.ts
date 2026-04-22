import { describe, expect, it } from "vitest";
import type { Note } from "../src/lib/api";
import {
  getClearedNoteEditorState,
  getOpenedNoteEditorState,
} from "../src/lib/noteEditorSession";

const note: Note = {
  id: "note-1",
  title: "Draft title",
  content: "Draft content",
  group_id: "g1",
  sort_order: 0,
  updated_at: "2026-04-22T00:00:00.000Z",
};

describe("FEATURE note editor session", () => {
  it("builds a cleared editor state for desktop without forcing a panel change", () => {
    expect(getClearedNoteEditorState({ isMobile: false })).toEqual({
      selectedNote: null,
      title: "",
      content: "",
      saveStatus: "saved",
      copyStatus: "ready",
      countStatus: "count-ready",
      conflictNote: null,
      pendingAction: null,
      dialogMode: null,
      mobilePanel: null,
    });
  });

  it("builds a cleared editor state for mobile and moves back to the notes panel", () => {
    expect(getClearedNoteEditorState({ isMobile: true }).mobilePanel).toBe("notes");
  });

  it("builds an opened editor state from the selected note", () => {
    expect(getOpenedNoteEditorState({ note, isMobile: false })).toEqual({
      selectedNote: note,
      title: "Draft title",
      content: "Draft content",
      saveStatus: "saved",
      copyStatus: "ready",
      countStatus: "count-stale",
      conflictNote: null,
      pendingAction: null,
      dialogMode: null,
      mobilePanel: null,
    });
  });

  it("opens the editor panel on mobile", () => {
    expect(getOpenedNoteEditorState({ note, isMobile: true }).mobilePanel).toBe("editor");
  });
});
