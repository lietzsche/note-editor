import { describe, expect, it } from "vitest";
import type { Note } from "../src/lib/api";
import {
  applyCreatedNoteToCache,
  applyMovedNoteToCache,
  removeNoteFromCache,
  syncGroupCachesFromAllNotes,
  updateNoteAcrossCache,
} from "../src/lib/noteCacheMutations";

function createNote(
  id: string,
  sortOrder: number,
  groupId: string | null,
  title = id
): Note {
  return {
    id,
    title,
    content: `${id}-content`,
    group_id: groupId,
    sort_order: sortOrder,
    updated_at: `${id}-updated`,
  };
}

function createCache() {
  return new Map<string, Note[]>([
    ["__all__", [
      createNote("n1", 0, "g1"),
      createNote("n2", 1, "g2"),
    ]],
    ["g1", [createNote("n1", 0, "g1")]],
    ["g2", [createNote("n2", 1, "g2")]],
  ]);
}

describe("FEATURE note cache mutations", () => {
  it("updates a matching note across every cached scope", () => {
    const cache = createCache();
    const updated = {
      ...createNote("n1", 0, "g1"),
      title: "updated title",
    };

    const nextCache = updateNoteAcrossCache(cache, updated);

    expect(nextCache.get("__all__")?.find((note) => note.id === "n1")?.title).toBe("updated title");
    expect(nextCache.get("g1")?.[0].title).toBe("updated title");
    expect(cache.get("__all__")?.find((note) => note.id === "n1")?.title).toBe("n1");
  });

  it("removes a note from every cached scope that contains it", () => {
    const cache = createCache();

    const nextCache = removeNoteFromCache(cache, "n1");

    expect(nextCache.get("__all__")?.map((note) => note.id)).toEqual(["n2"]);
    expect(nextCache.get("g1")).toEqual([]);
    expect(cache.get("__all__")?.map((note) => note.id)).toEqual(["n1", "n2"]);
  });

  it("adds a created note to all-notes and its group cache in sort order", () => {
    const cache = createCache();
    const created = createNote("n3", 0.5, "g1");

    const nextCache = applyCreatedNoteToCache(cache, created);

    expect(nextCache.get("__all__")?.map((note) => note.id)).toEqual(["n1", "n3", "n2"]);
    expect(nextCache.get("g1")?.map((note) => note.id)).toEqual(["n1", "n3"]);
  });

  it("moves a note between group caches while keeping all-notes synchronized", () => {
    const cache = createCache();
    const moved = createNote("n1", 2, "g2");

    const nextCache = applyMovedNoteToCache(cache, moved, "g1");

    expect(nextCache.get("__all__")?.map((note) => note.id)).toEqual(["n2", "n1"]);
    expect(nextCache.get("g1")).toEqual([]);
    expect(nextCache.get("g2")?.map((note) => note.id)).toEqual(["n2", "n1"]);
  });

  it("rebuilds every group cache from the all-notes snapshot", () => {
    const cache = createCache();
    const allNotes = [
      createNote("n1", 0, "g2"),
      createNote("n2", 1, "g2"),
      createNote("n3", 2, "g1"),
    ];

    const nextCache = syncGroupCachesFromAllNotes(cache, allNotes);

    expect(nextCache.get("__all__")?.map((note) => note.id)).toEqual(["n1", "n2", "n3"]);
    expect(nextCache.get("g1")?.map((note) => note.id)).toEqual(["n3"]);
    expect(nextCache.get("g2")?.map((note) => note.id)).toEqual(["n1", "n2"]);
  });
});
