import { describe, expect, it } from "vitest";
import type { Note } from "../src/lib/api";
import {
  ALL_NOTES_SCOPE_KEY,
  buildLoadNotesStartState,
  buildSetNotesForScopeCache,
  getLoadNotesErrorState,
  invalidateNotesRequestState,
  shouldApplyLoadedNotes,
} from "../src/lib/noteRequestState";

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

describe("FEATURE note request state", () => {
  it("writes cloned notes into the correct scope cache", () => {
    const cache = new Map<string, Note[]>();
    const notes = [createNote("n1", "g1")];

    const result = buildSetNotesForScopeCache(cache, "g1", notes);

    expect(result.scopeKey).toBe("g1");
    expect(result.snapshot).toEqual(notes);
    expect(result.snapshot).not.toBe(notes);
    expect(result.cache.get("g1")).toEqual(notes);
    expect(cache.size).toBe(0);
  });

  it("invalidates cache, in-flight requests, and bumps the request sequence", () => {
    const nextState = invalidateNotesRequestState(3);

    expect(nextState.cache.size).toBe(0);
    expect(nextState.inFlight.size).toBe(0);
    expect(nextState.requestSequence).toBe(4);
  });

  it("starts note loading in refreshing mode when cached notes exist", () => {
    const cache = new Map<string, Note[]>([
      [ALL_NOTES_SCOPE_KEY, [createNote("n1", null)]],
    ]);

    const startState = buildLoadNotesStartState({
      cache,
      groupId: null,
      preferCache: true,
    });

    expect(startState.scopeKey).toBe(ALL_NOTES_SCOPE_KEY);
    expect(startState.cached?.map((note) => note.id)).toEqual(["n1"]);
    expect(startState.loadState).toBe("refreshing");
    expect(startState.perfSource).toBe("warm");
  });

  it("starts note loading in loading mode when no cached notes exist", () => {
    const startState = buildLoadNotesStartState({
      cache: new Map(),
      groupId: "g1",
      preferCache: true,
    });

    expect(startState.scopeKey).toBe("g1");
    expect(startState.cached).toBeNull();
    expect(startState.loadState).toBe("loading");
    expect(startState.perfSource).toBe("cold");
  });

  it("applies loaded notes only for the latest request and active scope", () => {
    expect(shouldApplyLoadedNotes({
      requestSequence: 2,
      latestRequestSequence: 2,
      currentScopeKey: "g1",
      scopeKey: "g1",
    })).toBe(true);
    expect(shouldApplyLoadedNotes({
      requestSequence: 2,
      latestRequestSequence: 3,
      currentScopeKey: "g1",
      scopeKey: "g1",
    })).toBe(false);
  });

  it("maps load errors to ready when cached notes exist and to error otherwise", () => {
    expect(getLoadNotesErrorState({
      shouldApply: true,
      hasCachedNotes: true,
    })).toBe("ready");
    expect(getLoadNotesErrorState({
      shouldApply: true,
      hasCachedNotes: false,
    })).toBe("error");
    expect(getLoadNotesErrorState({
      shouldApply: false,
      hasCachedNotes: false,
    })).toBeNull();
  });
});
