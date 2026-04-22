import type { Note } from "./api";
import { cloneNotes, getNotesScopeKey } from "./noteCache";

const ALL_NOTES_SCOPE_KEY = "__all__";

function cloneCache(cache: Map<string, Note[]>) {
  return new Map(
    Array.from(cache.entries(), ([scopeKey, notes]) => [scopeKey, cloneNotes(notes)])
  );
}

function sortNotesByOrder(notes: Note[]) {
  return [...notes].sort((a, b) => a.sort_order - b.sort_order);
}

export function updateNoteAcrossCache(cache: Map<string, Note[]>, nextNote: Note) {
  const nextCache = cloneCache(cache);

  for (const [scopeKey, cachedNotes] of nextCache.entries()) {
    if (!cachedNotes.some((note) => note.id === nextNote.id)) continue;

    nextCache.set(
      scopeKey,
      cachedNotes.map((note) => (note.id === nextNote.id ? { ...nextNote } : note))
    );
  }

  return nextCache;
}

export function removeNoteFromCache(cache: Map<string, Note[]>, noteId: string) {
  const nextCache = cloneCache(cache);

  for (const [scopeKey, cachedNotes] of nextCache.entries()) {
    if (!cachedNotes.some((note) => note.id === noteId)) continue;
    nextCache.set(
      scopeKey,
      cachedNotes.filter((note) => note.id !== noteId)
    );
  }

  return nextCache;
}

export function applyCreatedNoteToCache(cache: Map<string, Note[]>, note: Note) {
  const nextCache = cloneCache(cache);
  const allNotes = nextCache.get(ALL_NOTES_SCOPE_KEY);

  if (allNotes) {
    nextCache.set(ALL_NOTES_SCOPE_KEY, sortNotesByOrder([...allNotes, note]));
  }

  if (note.group_id !== null) {
    const groupNotes = nextCache.get(note.group_id);
    if (groupNotes) {
      nextCache.set(note.group_id, sortNotesByOrder([...groupNotes, note]));
    }
  }

  return nextCache;
}

export function applyMovedNoteToCache(
  cache: Map<string, Note[]>,
  nextNote: Note,
  previousGroupId: string | null
) {
  let nextCache = removeNoteFromCache(cache, nextNote.id);
  const allNotes = nextCache.get(ALL_NOTES_SCOPE_KEY);

  if (allNotes) {
    nextCache.set(ALL_NOTES_SCOPE_KEY, sortNotesByOrder([...allNotes, nextNote]));
  }

  if (nextNote.group_id !== null) {
    const targetGroupNotes = nextCache.get(nextNote.group_id);
    if (targetGroupNotes) {
      nextCache.set(nextNote.group_id, sortNotesByOrder([...targetGroupNotes, nextNote]));
    }
  }

  if (previousGroupId && previousGroupId !== nextNote.group_id) {
    const sourceGroupNotes = nextCache.get(previousGroupId);
    if (sourceGroupNotes) {
      nextCache.set(
        previousGroupId,
        sourceGroupNotes.filter((note) => note.id !== nextNote.id)
      );
    }
  }

  return nextCache;
}

export function syncGroupCachesFromAllNotes(cache: Map<string, Note[]>, allNotes: Note[]) {
  const nextCache = cloneCache(cache);

  nextCache.set(ALL_NOTES_SCOPE_KEY, cloneNotes(allNotes));

  for (const scopeKey of nextCache.keys()) {
    if (scopeKey === ALL_NOTES_SCOPE_KEY) continue;
    nextCache.set(
      scopeKey,
      cloneNotes(allNotes.filter((note) => note.group_id === getNotesScopeKey(scopeKey)))
    );
  }

  return nextCache;
}
