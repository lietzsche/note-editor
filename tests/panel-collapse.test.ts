import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getVisiblePanels,
  readStorageBoolean,
  writeStorageBoolean,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  NOTELIST_COLLAPSED_STORAGE_KEY,
} from "../src/lib/panelCollapseState";

describe("panelCollapseState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("storage helpers", () => {
    it("reads and writes boolean values in localStorage", () => {
      const store = new Map<string, string>();
      const mockStorage: Storage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        length: store.size,
      };

      vi.stubGlobal("window", { localStorage: mockStorage });

      expect(readStorageBoolean(SIDEBAR_COLLAPSED_STORAGE_KEY, false)).toBe(false);

      writeStorageBoolean(SIDEBAR_COLLAPSED_STORAGE_KEY, true);
      expect(readStorageBoolean(SIDEBAR_COLLAPSED_STORAGE_KEY, false)).toBe(true);

      writeStorageBoolean(NOTELIST_COLLAPSED_STORAGE_KEY, false);
      expect(readStorageBoolean(NOTELIST_COLLAPSED_STORAGE_KEY, true)).toBe(false);

      vi.unstubAllGlobals();
    });

    it("falls back to default value when localStorage throws or is absent", () => {
      expect(readStorageBoolean("any-key", true)).toBe(true);
      expect(readStorageBoolean("any-key", false)).toBe(false);
      expect(() => writeStorageBoolean("any-key", true)).not.toThrow();
    });
  });

  describe("getVisiblePanels", () => {
    it("shows all 3 panels in default PC mode", () => {
      const result = getVisiblePanels({
        isMobile: false,
        mobilePanel: "notes",
        isSidebarCollapsed: false,
        isNoteListCollapsed: false,
        zenMode: false,
      });

      expect(result).toEqual({
        showGroupsPanel: true,
        showNotesPanel: true,
        showEditorPanel: true,
      });
    });

    it("collapses sidebar when isSidebarCollapsed is true on PC", () => {
      const result = getVisiblePanels({
        isMobile: false,
        mobilePanel: "notes",
        isSidebarCollapsed: true,
        isNoteListCollapsed: false,
        zenMode: false,
      });

      expect(result).toEqual({
        showGroupsPanel: false,
        showNotesPanel: true,
        showEditorPanel: true,
      });
    });

    it("collapses both sidebar and note list to give full width to editor on PC", () => {
      const result = getVisiblePanels({
        isMobile: false,
        mobilePanel: "notes",
        isSidebarCollapsed: true,
        isNoteListCollapsed: true,
        zenMode: false,
      });

      expect(result).toEqual({
        showGroupsPanel: false,
        showNotesPanel: false,
        showEditorPanel: true,
      });
    });

    it("always shows only editor in zen mode regardless of collapse states", () => {
      const result = getVisiblePanels({
        isMobile: false,
        mobilePanel: "notes",
        isSidebarCollapsed: false,
        isNoteListCollapsed: false,
        zenMode: true,
      });

      expect(result).toEqual({
        showGroupsPanel: false,
        showNotesPanel: false,
        showEditorPanel: true,
      });
    });

    it("respects mobilePanel on mobile regardless of PC collapse states", () => {
      expect(
        getVisiblePanels({
          isMobile: true,
          mobilePanel: "groups",
          isSidebarCollapsed: true,
          isNoteListCollapsed: true,
          zenMode: false,
        })
      ).toEqual({
        showGroupsPanel: true,
        showNotesPanel: false,
        showEditorPanel: false,
      });

      expect(
        getVisiblePanels({
          isMobile: true,
          mobilePanel: "editor",
          isSidebarCollapsed: false,
          isNoteListCollapsed: false,
          zenMode: false,
        })
      ).toEqual({
        showGroupsPanel: false,
        showNotesPanel: false,
        showEditorPanel: true,
      });
    });
  });
});
