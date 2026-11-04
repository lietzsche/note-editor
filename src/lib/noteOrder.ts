import type { Note } from "./api";

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

export function mergeGroupOrderIntoAllNotes(
  allNotes: Note[],
  groupId: string,
  orderedGroupNotes: Note[]
) {
  const groupNotesInAllOrder = allNotes.filter((note) => note.group_id === groupId);

  if (groupNotesInAllOrder.length !== orderedGroupNotes.length) {
    throw new Error("group note count mismatch");
  }

  const orderedGroupNotesById = new Set(orderedGroupNotes.map((note) => note.id));
  if (orderedGroupNotesById.size !== orderedGroupNotes.length) {
    throw new Error("duplicate group note ids");
  }

  for (const note of groupNotesInAllOrder) {
    if (!orderedGroupNotesById.has(note.id)) {
      throw new Error("group note ids mismatch");
    }
  }

  let nextGroupIndex = 0;

  return allNotes.map((note) => {
    if (note.group_id !== groupId) return { ...note };
    return { ...orderedGroupNotes[nextGroupIndex++] };
  });
}

export function moveNoteByOffset(notes: Note[], noteId: string, direction: -1 | 1): Note[] {
  const index = notes.findIndex((note) => note.id === noteId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= notes.length) return notes;
  return moveItem(notes, index, target);
}
