import { describe, expect, it } from "vitest";
import type { Note } from "../src/lib/api";
import {
  isConflictNoteData,
  shouldScheduleAutoSave,
} from "../src/pages/useNotePersistence";

const note: Note = {
  id: "n1",
  title: "Draft",
  content: "Body",
  group_id: "g1",
  sort_order: 0,
  updated_at: "2026-04-22T00:00:00.000Z",
};

describe("FEATURE note persistence helpers", () => {
  it("recognizes conflict payloads that contain a full note shape", () => {
    expect(isConflictNoteData(note)).toBe(true);
    expect(isConflictNoteData({ id: "n1" })).toBe(false);
    expect(isConflictNoteData(null)).toBe(false);
  });

  it("schedules auto-save only when a note is selected and status is not conflict", () => {
    expect(shouldScheduleAutoSave(note, "saved")).toBe(true);
    expect(shouldScheduleAutoSave(note, "dirty")).toBe(true);
    expect(shouldScheduleAutoSave(note, "conflict")).toBe(false);
    expect(shouldScheduleAutoSave(null, "saved")).toBe(false);
  });
});
