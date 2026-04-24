import type { Group, Note } from "../lib/api";
import { TRASH_NOTES_SCOPE_KEY } from "../lib/noteCache";

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
  const isTrashView = selectedGroupId === TRASH_NOTES_SCOPE_KEY;
  const normalizedSearchQuery = isTrashView ? "" : searchQuery.trim().toLocaleLowerCase();
  const filteredNotes = normalizedSearchQuery
    ? notes.filter((note) => matchesNoteSearch(note, normalizedSearchQuery))
    : notes;
  const isSearchActive = normalizedSearchQuery.length > 0;
  const noteListStatusLabel = getNoteListStatusLabel({
    noteReorderStatus,
    notesLoadState,
    selectedGroupId,
    isTrashView,
  });

  return {
    normalizedSearchQuery,
    filteredNotes,
    isSearchActive,
    isTrashView,
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
  return saveStatus === "saving" ? "저장 중.." :
    saveStatus === "dirty" ? "미저장" :
    saveStatus === "conflict" ? "충돌 발생" :
    saveStatus === "error" ? "저장 실패" :
    "저장됨";
}

export function getGroupListStatusLabel(
  groupReorderStatus: ReorderStatus,
  groupsCount: number
) {
  return groupReorderStatus === "saving" ? "그룹 정렬 저장 중.." :
    groupReorderStatus === "error" ? "그룹 정렬 실패" :
    groupsCount < 2 ? "그룹이 2개 이상이어야 정렬할 수 있습니다." :
    "드래그로 그룹 순서를 변경하세요.";
}

export function getNoteListStatusLabel({
  noteReorderStatus,
  notesLoadState,
  selectedGroupId,
  isTrashView = false,
}: {
  noteReorderStatus: ReorderStatus;
  notesLoadState: LoadState;
  selectedGroupId: string | null;
  isTrashView?: boolean;
}) {
  return noteReorderStatus === "saving" ? "정렬 저장 중.." :
    noteReorderStatus === "error" ? "정렬 실패" :
    notesLoadState === "loading" ? "노트 목록을 불러오는 중.." :
    notesLoadState === "refreshing" ? "목록을 백그라운드에서 새로 고치는 중.." :
    notesLoadState === "error" ? "목록을 불러오지 못했습니다." :
    isTrashView ? "최근 삭제 순으로 표시됩니다." :
    selectedGroupId === null ? "드래그로 전체 노트 순서를 변경하세요." :
    "드래그로 현재 그룹 노트 순서를 변경하세요.";
}

export function getCurrentGroupLabel(groups: Group[], selectedGroupId: string | null) {
  if (selectedGroupId === TRASH_NOTES_SCOPE_KEY) {
    return "휴지통";
  }
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
