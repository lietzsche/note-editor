import type { Note } from "./api";

export const ALL_NOTES_SCOPE_KEY = "__all__";
export const TRASH_NOTES_SCOPE_KEY = "__trash__";

export function getNotesScopeKey(groupId?: string | null) {
  return groupId === TRASH_NOTES_SCOPE_KEY
    ? TRASH_NOTES_SCOPE_KEY
    : groupId ?? ALL_NOTES_SCOPE_KEY;
}

export function isTrashNotesScopeKey(scopeKey?: string | null) {
  return scopeKey === TRASH_NOTES_SCOPE_KEY;
}

export function isGroupNotesScopeKey(scopeKey: string) {
  return scopeKey !== ALL_NOTES_SCOPE_KEY && scopeKey !== TRASH_NOTES_SCOPE_KEY;
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
