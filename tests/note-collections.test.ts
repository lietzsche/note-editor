import { describe, expect, it } from "vitest";
import type { Group, Note } from "../src/lib/api";
import {
  cloneGroups,
  removeGroupFromList,
  sortNotesByOrder,
  upsertGroupInList,
} from "../src/lib/noteCollections";

const groups: Group[] = [
  { id: "g1", name: "Work", position: 0 },
  { id: "g2", name: "Personal", position: 1 },
];

function createNote(id: string, sortOrder: number): Note {
  return {
    id,
    title: id,
    content: `${id}-content`,
    group_id: null,
    sort_order: sortOrder,
    updated_at: `${id}-updated`,
  };
}

describe("FEATURE note collections", () => {
  it("clones groups without keeping original object references", () => {
    const cloned = cloneGroups(groups);

    expect(cloned).toEqual(groups);
    expect(cloned).not.toBe(groups);
    expect(cloned[0]).not.toBe(groups[0]);
  });

  it("upserts a group and keeps the list sorted by position", () => {
    const nextGroup = { id: "g3", name: "Archive", position: 1 };

    const nextGroups = upsertGroupInList(groups, nextGroup);

    expect(nextGroups.map((group) => group.id)).toEqual(["g1", "g2", "g3"]);
    expect(groups.map((group) => group.id)).toEqual(["g1", "g2"]);
  });

  it("replaces an existing group when ids match", () => {
    const renamedGroup = { id: "g2", name: "Private", position: 1 };

    const nextGroups = upsertGroupInList(groups, renamedGroup);

    expect(nextGroups).toEqual([
      { id: "g1", name: "Work", position: 0 },
      { id: "g2", name: "Private", position: 1 },
    ]);
  });

  it("removes a group and compacts positions", () => {
    const nextGroups = removeGroupFromList(
      [...groups, { id: "g3", name: "Archive", position: 2 }],
      "g2"
    );

    expect(nextGroups).toEqual([
      { id: "g1", name: "Work", position: 0 },
      { id: "g3", name: "Archive", position: 1 },
    ]);
  });

  it("sorts notes by sort_order", () => {
    const notes = [
      createNote("n3", 3),
      createNote("n1", 1),
      createNote("n2", 2),
    ];

    expect(sortNotesByOrder(notes).map((note) => note.id)).toEqual(["n1", "n2", "n3"]);
    expect(notes.map((note) => note.id)).toEqual(["n3", "n1", "n2"]);
  });
});
