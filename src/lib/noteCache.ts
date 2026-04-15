import type { Note } from "./api";

export function getNotesScopeKey(groupId?: string | null) {
  return groupId ?? "__all__";
}

export function cloneNotes(notes: Note[]) {
  return notes.map((note) => ({ ...note }));
}

export function readCachedNotes(
  cache: Map<string, Note[]>,
  groupId?: string | null
) {
  const cached = cache.get(getNotesScopeKey(groupId));
  return cached ? cloneNotes(cached) : null;
}
