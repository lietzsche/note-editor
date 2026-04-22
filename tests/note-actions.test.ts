import { describe, expect, it } from "vitest";
import type { Note } from "../src/lib/api";
import { getNextNotesAfterMove } from "../src/pages/useNoteActions";

function createNote(id: string, groupId: string | null): Note {
  return {
    id,
    title: id,
    content: `${id}-content`,
    group_id: groupId,
    sort_order: 0,
    updated_at: `${id}-updated`,
  };
}

describe("FEATURE note actions helpers", () => {
  it("removes a moved note from the current list when it leaves the selected group", () => {
    const notes = [createNote("n1", "g1"), createNote("n2", "g1")];
    const updatedNote = createNote("n1", "g2");

    const nextNotes = getNextNotesAfterMove({
      notes,
      selectedGroupId: "g1",
      updatedNote,
      noteId: "n1",
    });

    expect(nextNotes.map((note) => note.id)).toEqual(["n2"]);
  });

  it("updates the current list item when the moved note remains visible", () => {
    const notes = [createNote("n1", null), createNote("n2", null)];
    const updatedNote = { ...createNote("n1", null), title: "updated" };

    const nextNotes = getNextNotesAfterMove({
      notes,
      selectedGroupId: null,
      updatedNote,
      noteId: "n1",
    });

    expect(nextNotes[0].title).toBe("updated");
    expect(nextNotes[1].id).toBe("n2");
  });
});
