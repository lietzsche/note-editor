import { describe, expect, it } from "vitest";
import { createSerializedAutoSaveRunner } from "../src/lib/noteAutoSave";

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("FEATURE-007 auto-save serialization", () => {
  it("serializes in-flight saves and re-reads the latest snapshot for the follow-up save", async () => {
    let state = {
      noteId: "note-1",
      title: "draft",
      content: "A",
      expectedUpdatedAt: "rev-1",
    };
    const firstGate = createDeferred();
    const secondGate = createDeferred();
    const seenSnapshots: typeof state[] = [];
    let callCount = 0;
    let activeCount = 0;
    let maxActiveCount = 0;

    const runner = createSerializedAutoSaveRunner({
      readSnapshot: () => ({ ...state }),
      run: async (snapshot) => {
        seenSnapshots.push(snapshot);
        callCount += 1;
        activeCount += 1;
        maxActiveCount = Math.max(maxActiveCount, activeCount);

        await (callCount === 1 ? firstGate.promise : secondGate.promise);

        activeCount -= 1;
        return true;
      },
    });

    const drainPromise = runner.requestRun();
    await Promise.resolve();

    state = {
      ...state,
      content: "AB",
      expectedUpdatedAt: "rev-2",
    };

    const sameDrainPromise = runner.requestRun();

    expect(sameDrainPromise).toBe(drainPromise);
    expect(seenSnapshots).toEqual([
      {
        noteId: "note-1",
        title: "draft",
        content: "A",
        expectedUpdatedAt: "rev-1",
      },
    ]);

    firstGate.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(seenSnapshots).toEqual([
      {
        noteId: "note-1",
        title: "draft",
        content: "A",
        expectedUpdatedAt: "rev-1",
      },
      {
        noteId: "note-1",
        title: "draft",
        content: "AB",
        expectedUpdatedAt: "rev-2",
      },
    ]);
    expect(maxActiveCount).toBe(1);

    secondGate.resolve();
    await drainPromise;
  });

  it("coalesces multiple requests during an in-flight save into one follow-up run", async () => {
    let state = {
      noteId: "note-1",
      title: "draft",
      content: "A",
      expectedUpdatedAt: "rev-1",
    };
    const firstGate = createDeferred();
    const secondGate = createDeferred();
    const seenContents: string[] = [];
    let runCount = 0;

    const runner = createSerializedAutoSaveRunner({
      readSnapshot: () => ({ ...state }),
      run: async (snapshot) => {
        seenContents.push(snapshot.content);
        runCount += 1;

        await (runCount === 1 ? firstGate.promise : secondGate.promise);
        return true;
      },
    });

    const drainPromise = runner.requestRun();
    await Promise.resolve();

    state = { ...state, content: "AB", expectedUpdatedAt: "rev-2" };
    void runner.requestRun();
    state = { ...state, content: "ABC", expectedUpdatedAt: "rev-3" };
    void runner.requestRun();

    firstGate.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(seenContents).toEqual(["A", "ABC"]);

    secondGate.resolve();
    await drainPromise;
  });

  it("stops queued follow-up runs when the snapshot is no longer available", async () => {
    let active = true;
    const firstGate = createDeferred();
    const seen: number[] = [];

    const runner = createSerializedAutoSaveRunner({
      readSnapshot: () => (active ? { revision: seen.length + 1 } : null),
      run: async (snapshot) => {
        seen.push(snapshot.revision);
        await firstGate.promise;
        return true;
      },
    });

    const drainPromise = runner.requestRun();
    await Promise.resolve();

    void runner.requestRun();
    active = false;

    firstGate.resolve();
    await drainPromise;

    expect(seen).toEqual([1]);
  });
});
