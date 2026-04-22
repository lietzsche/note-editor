import type { Group, Note } from "../lib/api";

export type SaveStatus = "saved" | "saving" | "error" | "dirty" | "conflict";
export type MobilePanel = "groups" | "notes" | "editor";
export type LoadState = "idle" | "loading" | "refreshing" | "ready" | "error";
export type ReorderStatus = "idle" | "saving" | "error";

type DeriveNotesPageStateArgs = {
  groups: Group[];
  notes: Note[];
  searchQuery: string;
  saveStatus: SaveStatus;
  groupReorderStatus: ReorderStatus;
  noteReorderStatus: ReorderStatus;
  notesLoadState: LoadState;
  selectedGroupId: string | null;
  isMobile: boolean;
  mobilePanel: MobilePanel;
};

export function deriveNotesPageState({
  groups,
  notes,
  searchQuery,
  saveStatus,
  groupReorderStatus,
  noteReorderStatus,
  notesLoadState,
  selectedGroupId,
  isMobile,
  mobilePanel,
}: DeriveNotesPageStateArgs) {
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredNotes = normalizedSearchQuery
    ? notes.filter((note) => matchesNoteSearch(note, normalizedSearchQuery))
    : notes;
  const isSearchActive = normalizedSearchQuery.length > 0;
  const noteListStatusLabel = getNoteListStatusLabel({
    noteReorderStatus,
    notesLoadState,
    selectedGroupId,
  });

  return {
    normalizedSearchQuery,
    filteredNotes,
    isSearchActive,
    saveLabel: getSaveLabel(saveStatus),
    groupListStatusLabel: getGroupListStatusLabel(groupReorderStatus, groups.length),
    noteListStatusLabel,
    effectiveNoteListStatusLabel: isSearchActive
      ? `${filteredNotes.length}媛?寃??寃곌낵`
      : noteListStatusLabel,
    currentGroupLabel: getCurrentGroupLabel(groups, selectedGroupId),
    ...getPanelVisibility(isMobile, mobilePanel),
  };
}

export function matchesNoteSearch(note: Note, normalizedQuery: string) {
  const haystack = `${note.title}\n${note.content}`.toLocaleLowerCase();
  return haystack.includes(normalizedQuery);
}

export function getSaveLabel(saveStatus: SaveStatus) {
  return saveStatus === "saving" ? "???以?.." :
    saveStatus === "dirty" ? "誘몄???" :
    saveStatus === "conflict" ? "異⑸룎 諛쒖깮" :
    saveStatus === "error" ? "????ㅽ뙣" :
    "??λ맖";
}

export function getGroupListStatusLabel(
  groupReorderStatus: ReorderStatus,
  groupsCount: number
) {
  return groupReorderStatus === "saving" ? "洹몃９ ?뺣젹 ???以?.." :
    groupReorderStatus === "error" ? "洹몃９ ?뺣젹 ?ㅽ뙣" :
    groupsCount < 2 ? "洹몃９? 2媛??댁긽?댁뼱???뺣젹 媛?ν빀?덈떎." :
    "?쒕옒洹몃줈 洹몃９ ?쒖꽌瑜?蹂寃쏀븯?몄슂.";
}

export function getNoteListStatusLabel({
  noteReorderStatus,
  notesLoadState,
  selectedGroupId,
}: {
  noteReorderStatus: ReorderStatus;
  notesLoadState: LoadState;
  selectedGroupId: string | null;
}) {
  return noteReorderStatus === "saving" ? "?뺣젹 ???以?.." :
    noteReorderStatus === "error" ? "?뺣젹 ?ㅽ뙣" :
    notesLoadState === "loading" ? "?명듃 遺덈윭?ㅻ뒗 以?.." :
    notesLoadState === "refreshing" ? "紐⑸줉 諛깃렇?쇱슫??媛깆떊 以?.." :
    notesLoadState === "error" ? "紐⑸줉 媛깆떊 ?ㅽ뙣" :
    selectedGroupId === null ? "?쒕옒洹몃줈 ?꾩껜 ?명듃瑜??뺣젹?섏꽭??" :
    "?쒕옒洹몃줈 ?꾩옱 洹몃９ ?명듃瑜??뺣젹?섏꽭??";
}

export function getCurrentGroupLabel(groups: Group[], selectedGroupId: string | null) {
  return selectedGroupId
    ? groups.find((group) => group.id === selectedGroupId)?.name ?? "洹몃９"
    : "?꾩껜 ?명듃";
}

export function getPanelVisibility(isMobile: boolean, mobilePanel: MobilePanel) {
  return {
    showGroupsPanel: !isMobile || mobilePanel === "groups",
    showNotesPanel: !isMobile || mobilePanel === "notes",
    showEditorPanel: !isMobile || mobilePanel === "editor",
  };
}
