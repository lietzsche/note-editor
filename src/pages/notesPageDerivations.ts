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
      ? `${filteredNotes.length}개 검색 결과`
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
  return saveStatus === "saving" ? "저장 중..." :
    saveStatus === "dirty" ? "미저장" :
    saveStatus === "conflict" ? "충돌 발생" :
    saveStatus === "error" ? "저장 실패" :
    "저장됨";
}

export function getGroupListStatusLabel(
  groupReorderStatus: ReorderStatus,
  groupsCount: number
) {
  return groupReorderStatus === "saving" ? "그룹 정렬 저장 중..." :
    groupReorderStatus === "error" ? "그룹 정렬 실패" :
    groupsCount < 2 ? "그룹은 2개 이상이어야 정렬 가능합니다." :
    "드래그로 그룹 순서를 변경하세요.";
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
  return noteReorderStatus === "saving" ? "정렬 저장 중..." :
    noteReorderStatus === "error" ? "정렬 실패" :
    notesLoadState === "loading" ? "노트 불러오는 중..." :
    notesLoadState === "refreshing" ? "목록 백그라운드 갱신 중..." :
    notesLoadState === "error" ? "목록 갱신 실패" :
    selectedGroupId === null ? "드래그로 전체 노트를 정렬하세요." :
    "드래그로 현재 그룹 노트를 정렬하세요.";
}

export function getCurrentGroupLabel(groups: Group[], selectedGroupId: string | null) {
  return selectedGroupId
    ? groups.find((group) => group.id === selectedGroupId)?.name ?? "그룹"
    : "전체 노트";
}

export function getPanelVisibility(isMobile: boolean, mobilePanel: MobilePanel) {
  return {
    showGroupsPanel: !isMobile || mobilePanel === "groups",
    showNotesPanel: !isMobile || mobilePanel === "notes",
    showEditorPanel: !isMobile || mobilePanel === "editor",
  };
}
