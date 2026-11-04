export const SIDEBAR_COLLAPSED_STORAGE_KEY = "note-editor:sidebar-collapsed";

export function readStorageBoolean(key: string, fallback = false): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

export function writeStorageBoolean(key: string, value: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // quota exceeded or private mode ignore
  }
}

export type VisiblePanelsArgs = {
  isMobile: boolean;
  mobilePanel: "groups" | "notes" | "editor";
  isSidebarCollapsed: boolean;
  zenMode: boolean;
};

export type VisiblePanels = {
  showGroupsPanel: boolean;
  showNotesPanel: boolean;
  showEditorPanel: boolean;
};

export function getVisiblePanels({
  isMobile,
  mobilePanel,
  isSidebarCollapsed,
  zenMode,
}: VisiblePanelsArgs): VisiblePanels {
  if (zenMode) {
    return {
      showGroupsPanel: false,
      showNotesPanel: false,
      showEditorPanel: true,
    };
  }

  if (isMobile) {
    return {
      showGroupsPanel: mobilePanel === "groups",
      showNotesPanel: mobilePanel === "notes",
      showEditorPanel: mobilePanel === "editor",
    };
  }

  const showSidebar = !isSidebarCollapsed;
  return {
    showGroupsPanel: showSidebar,
    showNotesPanel: showSidebar,
    showEditorPanel: true,
  };
}
