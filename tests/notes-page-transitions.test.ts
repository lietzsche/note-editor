import { describe, expect, it } from "vitest";
import type { Note } from "../src/lib/api";
import {
  getNextMobilePanelAfterGroupSelection,
  getTransitionDialogMode,
  hasBlockingEdits,
  shouldClearSelectedNoteOnGroupSelection,
  shouldOpenTransitionForGroupSelection,
  shouldOpenTransitionForNoteSelection,
} from "../src/lib/notesPageTransitions";

const selectedNote: Note = {
  id: "note-1",
  title: "Draft",
  content: "content",
  group_id: "g1",
  sort_order: 0,
  updated_at: "2026-04-22T00:00:00.000Z",
};

describe("FEATURE notes page transitions", () => {
  it("treats dirty, error, and conflict saves as blocking when a note is selected", () => {
    expect(hasBlockingEdits(selectedNote, "dirty")).toBe(true);
    expect(hasBlockingEdits(selectedNote, "error")).toBe(true);
    expect(hasBlockingEdits(selectedNote, "conflict")).toBe(true);
    expect(hasBlockingEdits(selectedNote, "saved")).toBe(false);
    expect(hasBlockingEdits(null, "dirty")).toBe(false);
  });

  it("maps conflict saves to the conflict dialog and all others to the transition dialog", () => {
    expect(getTransitionDialogMode("conflict")).toBe("conflict");
    expect(getTransitionDialogMode("dirty")).toBe("transition");
  });

  it("clears the selected note only when the chosen group hides that note", () => {
    expect(shouldClearSelectedNoteOnGroupSelection("g2", selectedNote)).toBe(true);
    expect(shouldClearSelectedNoteOnGroupSelection("g1", selectedNote)).toBe(false);
    expect(shouldClearSelectedNoteOnGroupSelection(null, selectedNote)).toBe(false);
  });

  it("returns the notes panel for mobile group selection and no override on desktop", () => {
    expect(getNextMobilePanelAfterGroupSelection(true)).toBe("notes");
    expect(getNextMobilePanelAfterGroupSelection(false)).toBeNull();
  });

  it("opens a transition only when the selection changes and blocking edits exist", () => {
    expect(shouldOpenTransitionForGroupSelection({
      selectedGroupId: "g1",
      nextGroupId: "g2",
      selectedNote,
      saveStatus: "dirty",
    })).toBe(true);
    expect(shouldOpenTransitionForGroupSelection({
      selectedGroupId: "g1",
      nextGroupId: "g1",
      selectedNote,
      saveStatus: "dirty",
    })).toBe(false);
    expect(shouldOpenTransitionForNoteSelection({
      selectedNote,
      nextNote: { ...selectedNote, id: "note-2" },
      saveStatus: "saved",
    })).toBe(false);
    expect(shouldOpenTransitionForNoteSelection({
      selectedNote,
      nextNote: { ...selectedNote, id: "note-2" },
      saveStatus: "error",
    })).toBe(true);
  });
});
