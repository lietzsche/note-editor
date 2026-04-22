import type { Note } from "./api";
import { cloneNotes, getNotesScopeKey, readCachedNotes } from "./noteCache";
import type { LoadState } from "../pages/notesPageDerivations";

export const ALL_NOTES_SCOPE_KEY = "__all__";

export function buildSetNotesForScopeCache(
  cache: Map<string, Note[]>,
  groupId: string | null,
  nextNotes: Note[]
) {
  const nextCache = new Map(cache);
  const scopeKey = getNotesScopeKey(groupId);
  const snapshot = cloneNotes(nextNotes);

  nextCache.set(scopeKey, snapshot);

  return {
    scopeKey,
    snapshot,
    cache: nextCache,
  };
}

export function invalidateNotesRequestState(nextRequestSequence: number) {
  return {
    cache: new Map<string, Note[]>(),
    inFlight: new Map<string, Promise<Note[]>>(),
    requestSequence: nextRequestSequence + 1,
  };
}

export function buildLoadNotesStartState(args: {
  cache: Map<string, Note[]>;
  groupId?: string | null;
  preferCache?: boolean;
}) {
  const normalizedGroupId = args.groupId ?? null;
  const scopeKey = getNotesScopeKey(normalizedGroupId);
  const cached = args.preferCache ? readCachedNotes(args.cache, normalizedGroupId) : null;

  return {
    normalizedGroupId,
    scopeKey,
    cached,
    loadState: (cached ? "refreshing" : "loading") as LoadState,
    perfSource: cached ? "warm" as const : "cold" as const,
  };
}

export function shouldApplyLoadedNotes(args: {
  requestSequence: number;
  latestRequestSequence: number;
  currentScopeKey: string;
  scopeKey: string;
}) {
  return (
    args.requestSequence === args.latestRequestSequence &&
    args.currentScopeKey === args.scopeKey
  );
}

export function getLoadNotesErrorState(args: {
  shouldApply: boolean;
  hasCachedNotes: boolean;
}) {
  if (!args.shouldApply) return null;
  return args.hasCachedNotes ? "ready" : "error";
}
