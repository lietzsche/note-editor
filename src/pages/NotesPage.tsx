import { startTransition, useEffect, useRef, useState } from "react";
import { api, type Note } from "../lib/api";
import { NotesPageLayout } from "../components/NotesPageLayout";
import { countGraphemes } from "../lib/editorProductivity";
import {
  getClearedNoteEditorState,
  getOpenedNoteEditorState,
  type CopyStatus,
  type CountStatus,
} from "../lib/noteEditorSession";
import { sortNotesByOrder } from "../lib/noteCollections";
import {
  getNextMobilePanelAfterGroupSelection,
  getTransitionDialogMode,
  hasBlockingEdits as hasBlockingEditsForNote,
  shouldClearSelectedNoteOnGroupSelection,
  shouldOpenTransitionForGroupSelection,
  shouldOpenTransitionForNoteSelection,
  type PendingAction,
} from "../lib/notesPageTransitions";
import { getNoteGroupSelectValue } from "../lib/noteGroupSelect";
import {
  appendPerfSample,
  buildPerfConsoleLine,
  type PerfSample,
} from "../lib/performanceDebug";
import {
  deriveNotesPageState,
  type MobilePanel,
  type SaveStatus,
} from "./notesPageDerivations";
import { useNotesData } from "./useNotesData";
import { useNotePersistence } from "./useNotePersistence";

type Props = {
  username: string;
  onLogout: () => void;
};

const MOBILE_MEDIA_QUERY = "(max-width: 900px)";
const DEFAULT_GROUP_NAME = "미분류";
const PERF_DEBUG_ENABLED = import.meta.env.DEV;

type PendingGroupPerf = {
  groupId: string | null;
  label: string;
  startTime: number;
  source: "cold" | "warm";
};

export default function NotesPage({ username, onLogout }: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("ready");
  const [countStatus, setCountStatus] = useState<CountStatus>("count-ready");
  const [newGroupName, setNewGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA_QUERY).matches
  );
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("groups");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [dialogMode, setDialogMode] = useState<"transition" | "conflict" | null>(null);
  const [conflictNote, setConflictNote] = useState<Note | null>(null);
  const [perfSamples, setPerfSamples] = useState<PerfSample[]>([]);
  const [shareInfo, setShareInfo] = useState<{
    share_token: string | null;
    is_active: boolean;
    expires_at: string | null;
    access_count: number;
    share_url: string | null;
  } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const selectedNoteIdRef = useRef<string | null>(null);
  const selectedNoteUpdatedAtRef = useRef<string | null>(null);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const conflictNoteRef = useRef<Note | null>(null);
  const pendingGroupPerfRef = useRef<PendingGroupPerf | null>(null);
  const {
    groups,
    notes,
    setNotes,
    notesLoadState,
    groupReorderStatus,
    noteReorderStatus,
    notesCacheRef,
    currentScopeKeyRef,
    loadNotes,
    setNotesForScope,
    invalidateAllNotesCache,
    upsertGroup,
    removeGroup,
    updateNoteAcrossCaches,
    removeNoteFromCaches,
    applyCreatedNoteToCaches,
    applyMovedNoteToCaches,
    handleGroupReorder,
    handleNoteReorder,
  } = useNotesData({
    selectedGroupId,
    pendingGroupPerfRef,
  });
  const {
    cancelScheduledSave,
    resetPersistenceSession,
    activateAutoSaveRunner,
    persistCurrentNote,
    handleTitleChange,
    handleContentChange,
    handleCopy,
  } = useNotePersistence({
    selectedNote,
    saveStatus,
    content,
    selectedNoteIdRef,
    selectedNoteUpdatedAtRef,
    titleRef,
    contentRef,
    conflictNoteRef,
    notesCacheRef,
    currentScopeKeyRef,
    setNotes,
    setSelectedNote,
    setTitle,
    setContent,
    setSaveStatus,
    setCopyStatus,
    setCountStatus,
    setConflictNote,
    setDialogMode,
    updateNoteAcrossCaches,
  });
  const defaultGroup = groups.find((group) => group.name === DEFAULT_GROUP_NAME) ?? null;
  const defaultGroupId = defaultGroup?.id ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!PERF_DEBUG_ENABLED) return;

    const pending = pendingGroupPerfRef.current;
    if (!pending || pending.groupId !== selectedGroupId) return;

    afterNextPaint(() => {
      const current = pendingGroupPerfRef.current;
      if (!current || current.groupId !== selectedGroupId) return;

      pendingGroupPerfRef.current = null;
      recordPerfSample({
        id: `group-${selectedGroupId ?? "all"}-${Date.now()}`,
        kind: "group-switch",
        label: current.label,
        durationMs: performance.now() - current.startTime,
        summary: `${current.source === "warm" ? "캐시" : "네트워크"} · ${notes.length}개 노트 렌더`,
        measuredAt: new Date().toISOString(),
      });
    });
  }, [notes, selectedGroupId]);

  useEffect(() => {
    if (!isMobile) return;
    if (mobilePanel === "editor" && !selectedNote) {
      setMobilePanel("notes");
    }
  }, [isMobile, mobilePanel, selectedNote]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (countStatus !== "count-stale") return undefined;

    const timer = setTimeout(() => {
      setCountStatus("count-ready");
    }, 0);

    return () => clearTimeout(timer);
  }, [countStatus, selectedNote?.id, content]);

  useEffect(() => {
    if (!selectedNote) {
      setShareInfo(null);
      return;
    }
    setShareLoading(true);
    api.notes.share.get(selectedNote.id)
      .then((info) => {
        setShareInfo(info);
      })
      .catch(() => {
        setShareInfo(null);
      })
      .finally(() => {
        setShareLoading(false);
      });
  }, [selectedNote?.id]);

  function afterNextPaint(callback: () => void) {
    if (typeof window === "undefined") {
      callback();
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(callback);
    });
  }

  function recordPerfSample(sample: PerfSample) {
    if (!PERF_DEBUG_ENABLED) return;

    setPerfSamples((prev) => appendPerfSample(prev, sample));
    console.info(buildPerfConsoleLine(sample));
  }

  function getGroupLabel(groupId: string | null) {
    if (groupId === null) return "전체 노트";
    return groups.find((group) => group.id === groupId)?.name ?? "그룹";
  }

  function hasBlockingEdits() {
    return hasBlockingEditsForNote(selectedNote, saveStatus);
  }

  function openTransitionDialog(action: PendingAction) {
    cancelScheduledSave();
    setPendingAction(action);
    setDialogMode(getTransitionDialogMode(saveStatus));
  }

  function applyGroupSelection(groupId: string | null) {
    if (PERF_DEBUG_ENABLED) {
      pendingGroupPerfRef.current = {
        groupId,
        label: getGroupLabel(groupId),
        startTime: performance.now(),
        source: "cold",
      };
    }

    setSelectedGroupId(groupId);
    if (shouldClearSelectedNoteOnGroupSelection(groupId, selectedNote)) {
      clearSelectedNoteView();
      return;
    }
    const nextMobilePanel = getNextMobilePanelAfterGroupSelection(isMobile);
    if (nextMobilePanel) {
      setMobilePanel(nextMobilePanel);
    }
  }

  function selectGroup(groupId: string | null) {
    if (shouldOpenTransitionForGroupSelection({
      selectedGroupId,
      nextGroupId: groupId,
      selectedNote,
      saveStatus,
    })) {
      openTransitionDialog({ type: "select-group", groupId });
      return;
    }
    if (groupId === selectedGroupId) return;
    applyGroupSelection(groupId);
  }

  function clearSelectedNoteView() {
    const nextEditorState = getClearedNoteEditorState({ isMobile });

    resetPersistenceSession();
    selectedNoteIdRef.current = null;
    selectedNoteUpdatedAtRef.current = null;
    setSelectedNote(nextEditorState.selectedNote);
    titleRef.current = "";
    contentRef.current = "";
    setTitle(nextEditorState.title);
    setContent(nextEditorState.content);
    setSaveStatus(nextEditorState.saveStatus);
    setCopyStatus(nextEditorState.copyStatus);
    setCountStatus(nextEditorState.countStatus);
    conflictNoteRef.current = null;
    setConflictNote(nextEditorState.conflictNote);
    setPendingAction(nextEditorState.pendingAction);
    setDialogMode(nextEditorState.dialogMode);
    if (nextEditorState.mobilePanel) {
      setMobilePanel(nextEditorState.mobilePanel);
    }
  }

  function openNote(note: Note) {
    const noteOpenStart = PERF_DEBUG_ENABLED ? performance.now() : 0;
    const nextEditorState = getOpenedNoteEditorState({ note, isMobile });

    resetPersistenceSession();
    selectedNoteIdRef.current = note.id;
    selectedNoteUpdatedAtRef.current = note.updated_at;
    titleRef.current = note.title;
    contentRef.current = note.content;
    conflictNoteRef.current = null;
    activateAutoSaveRunner(note.id);
    startTransition(() => {
      setSelectedNote(nextEditorState.selectedNote);
      setTitle(nextEditorState.title);
      setContent(nextEditorState.content);
      setSaveStatus(nextEditorState.saveStatus);
      setCopyStatus(nextEditorState.copyStatus);
      setCountStatus(nextEditorState.countStatus);
      setConflictNote(nextEditorState.conflictNote);
      setPendingAction(nextEditorState.pendingAction);
      setDialogMode(nextEditorState.dialogMode);
      if (nextEditorState.mobilePanel) {
        setMobilePanel(nextEditorState.mobilePanel);
      }
    });

    if (PERF_DEBUG_ENABLED) {
      const noteId = note.id;
      const titleLabel = note.title || "(제목 없음)";
      const contentLength = note.content.length;

      afterNextPaint(() => {
        if (selectedNoteIdRef.current !== noteId) return;

        recordPerfSample({
          id: `note-${noteId}-${Date.now()}`,
          kind: "note-open",
          label: titleLabel,
          durationMs: performance.now() - noteOpenStart,
          summary: `본문 ${contentLength}자 렌더`,
          measuredAt: new Date().toISOString(),
        });
      });
    }
  }

  function selectNote(note: Note) {
    if (shouldOpenTransitionForNoteSelection({
      selectedNote,
      nextNote: note,
      saveStatus,
    })) {
      openTransitionDialog({ type: "select-note", note });
      return;
    }
    if (note.id === selectedNote?.id) return;
    openNote(note);
  }

  async function executePendingAction(action: PendingAction) {
    if (action.type === "select-note") {
      openNote(action.note);
      return;
    }

    if (action.type === "select-group") {
      applyGroupSelection(action.groupId);
      return;
    }

    if (action.type === "create-note") {
      await createNoteImmediately();
      return;
    }

    if (action.type === "move-note-group") {
      await moveNoteGroupImmediately(action.noteId, action.groupId);
      return;
    }

    await logoutImmediately();
  }

  useEffect(() => {
    if (!selectedNote || selectedGroupId === null) return;

    const noteStillVisible = notes.some((note) => note.id === selectedNote.id);
    if (!noteStillVisible) {
      clearSelectedNoteView();
    }
  }, [notes, selectedGroupId, selectedNote, isMobile]);

  async function createNoteImmediately() {
    const note = await api.notes.create({
      title: "새 노트",
      group_id: selectedGroupId ?? undefined,
    });
    applyCreatedNoteToCaches(note);
    setNotesForScope(selectedGroupId, sortNotesByOrder([...notes, note]));
    openNote(note);
  }

  async function createNote() {
    if (hasBlockingEdits()) {
      openTransitionDialog({ type: "create-note" });
      return;
    }
    await createNoteImmediately();
  }

  async function deleteNote(id: string) {
    if (!window.confirm("노트를 삭제할까요?")) return;
    await api.notes.delete(id);
    const nextNotes = notes.filter((note) => note.id !== id);
    removeNoteFromCaches(id);
    setNotesForScope(selectedGroupId, nextNotes);
    if (selectedNote?.id === id) {
      clearSelectedNoteView();
    }
  }

  async function handleShareToggle() {
    if (!selectedNote || shareLoading) return;
    setShareLoading(true);
    try {
      if (shareInfo?.is_active && shareInfo.share_token) {
        await api.notes.share.deactivate(selectedNote.id);
        setShareInfo(null);
      } else {
        const info = await api.notes.share.activate(selectedNote.id);
        setShareInfo(info);
      }
    } catch (error) {
      console.error('공유 설정 변경 실패:', error);
    } finally {
      setShareLoading(false);
    }
  }

  async function logoutImmediately() {
    await api.auth.logout();
    onLogout();
  }

  async function handleLogout() {
    if (hasBlockingEdits()) {
      openTransitionDialog({ type: "logout" });
      return;
    }
    await logoutImmediately();
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const createdGroup = await api.groups.create(newGroupName.trim());
      setNewGroupName("");
      upsertGroup(createdGroup);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "그룹 생성에 실패했습니다.");
    }
  }

  async function handleRenameGroup(id: string, currentName: string) {
    const nextName = window.prompt("새 그룹 이름을 입력하세요.", currentName);
    if (nextName === null) return;

    const normalizedName = nextName.trim();
    if (!normalizedName || normalizedName === currentName) return;

    try {
      const updatedGroup = await api.groups.update(id, normalizedName);
      upsertGroup(updatedGroup);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "그룹 이름 변경에 실패했습니다.");
    }
  }

  async function handleDeleteGroup(id: string, name: string) {
    if (!window.confirm(`"${name}" 그룹을 삭제할까요? 소속 노트는 미분류로 이동됩니다.`)) return;
    const wasSelectedGroup = selectedGroupId === id;
    const selectedNoteWasInGroup = selectedNote?.group_id === id;

    try {
      await api.groups.delete(id);
      removeGroup(id);
      invalidateAllNotesCache();
      if (wasSelectedGroup) setSelectedGroupId(null);

      if (!wasSelectedGroup) {
        await loadNotes(selectedGroupId ?? undefined, { preferCache: true });
      }

      if (selectedNoteWasInGroup && selectedNote) {
        const refreshedNote = await api.notes.get(selectedNote.id);
        openNote(refreshedNote);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "그룹 삭제에 실패했습니다.");
    }
  }

  async function moveNoteGroupImmediately(noteId: string, groupId: string | null) {
    const targetNote = selectedNote?.id === noteId
      ? selectedNote
      : notes.find((note) => note.id === noteId);

    if (!targetNote) return;
    if (groupId === targetNote.group_id) return;

    try {
      const previousGroupId = targetNote.group_id;
      const updatedNote = await api.notes.moveGroup(noteId, groupId);
      applyMovedNoteToCaches(updatedNote, previousGroupId);

      const nextNotes = selectedGroupId !== null && updatedNote.group_id !== selectedGroupId
        ? notes.filter((note) => note.id !== noteId)
        : notes.map((note) => (note.id === updatedNote.id ? updatedNote : note));

      setNotesForScope(selectedGroupId, nextNotes);

      if (selectedNote?.id !== noteId) return;

      if (selectedGroupId !== null && updatedNote.group_id !== selectedGroupId) {
        clearSelectedNoteView();
        return;
      }

      openNote(updatedNote);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "노트 그룹 이동에 실패했습니다.");
    }
  }

  async function handleMoveNoteGroup(note: Note, groupId: string | null) {
    if (groupId === note.group_id) return;

    if (selectedNote?.id === note.id && hasBlockingEdits()) {
      openTransitionDialog({ type: "move-note-group", noteId: note.id, groupId });
      return;
    }

    await moveNoteGroupImmediately(note.id, groupId);
  }

  async function handleMoveSelectedNoteGroup(groupId: string | null) {
    if (!selectedNote) return;
    await handleMoveNoteGroup(selectedNote, groupId);
  }

  async function handleDialogPrimaryAction() {
    const saved = await persistCurrentNote(dialogMode === "conflict");
    if (!saved) return;

    const action = pendingAction;
    setPendingAction(null);
    setDialogMode(null);

    if (action) {
      await executePendingAction(action);
    }
  }

  async function handleDialogDiscardAction() {
    const action = pendingAction;
    cancelScheduledSave();
    setPendingAction(null);
    setDialogMode(null);
    conflictNoteRef.current = null;
    setConflictNote(null);
    setSaveStatus("saved");
    setCopyStatus("ready");

    if (action) {
      await executePendingAction(action);
    }
  }

  function handleDialogCancelAction() {
    setPendingAction(null);
    setDialogMode(null);
  }

  async function handleRetrySave() {
    await persistCurrentNote(saveStatus === "conflict");
  }

  const charCount = countGraphemes(content);
  const {
    filteredNotes,
    isSearchActive,
    saveLabel,
    groupListStatusLabel,
    effectiveNoteListStatusLabel,
    currentGroupLabel,
    showGroupsPanel,
    showNotesPanel,
    showEditorPanel,
  } = deriveNotesPageState({
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
  });
  const selectedNoteGroupValue = selectedNote
    ? getNoteGroupSelectValue(selectedNote.group_id, defaultGroupId)
    : "";

  const isConflictDialog = dialogMode === "conflict";
  const primaryDialogLabel =
    isConflictDialog
      ? pendingAction ? "덮어쓰고 이동" : "덮어쓰기"
      : saveStatus === "error" ? "다시 저장 후 이동" : "저장 후 이동";
  const dialogTitle =
    isConflictDialog ? "저장 충돌이 발생했습니다." : "미저장 변경이 있습니다.";
  const dialogDescription =
    isConflictDialog
      ? "다른 세션에서 먼저 저장되었습니다. 최신 서버 내용을 확인한 뒤 덮어쓸지 결정하세요."
      : saveStatus === "error"
        ? "마지막 입력값은 유지되어 있습니다. 다시 저장하거나 버리고 이동할 수 있습니다."
        : "현재 편집 중인 내용을 저장한 뒤 이동할지, 버리고 이동할지 선택하세요.";
  return (
    <NotesPageLayout
      styles={styles}
      isMobile={isMobile}
      mobilePanel={mobilePanel}
      setMobilePanel={setMobilePanel}
      showGroupsPanel={showGroupsPanel}
      showNotesPanel={showNotesPanel}
      showEditorPanel={showEditorPanel}
      username={username}
      groups={groups}
      selectedGroupId={selectedGroupId}
      currentGroupLabel={currentGroupLabel}
      defaultGroupId={defaultGroupId}
      defaultGroupName={DEFAULT_GROUP_NAME}
      groupListStatusLabel={groupListStatusLabel}
      noteListStatusLabel={effectiveNoteListStatusLabel}
      notes={filteredNotes}
      totalNotesCount={notes.length}
      notesLoadState={notesLoadState}
      selectedNote={selectedNote}
      searchQuery={searchQuery}
      selectedNoteGroupValue={selectedNoteGroupValue}
      title={title}
      content={content}
      saveLabel={saveLabel}
      saveStatus={saveStatus}
      charCount={charCount}
      countStatus={countStatus}
      copyStatus={copyStatus}
      newGroupName={newGroupName}
      groupReorderBusy={groupReorderStatus === "saving"}
      noteReorderBusy={noteReorderStatus === "saving"}
      dialogMode={dialogMode}
      dialogTitle={dialogTitle}
      dialogDescription={dialogDescription}
      primaryDialogLabel={primaryDialogLabel}
      isConflictDialog={isConflictDialog}
      conflictNote={conflictNote}
      hasPendingAction={Boolean(pendingAction)}
      perfDebugEnabled={PERF_DEBUG_ENABLED}
      perfSamples={perfSamples}
      onLogout={handleLogout}
      onSelectGroup={selectGroup}
      onRenameGroup={(groupId, groupName) => {
        void handleRenameGroup(groupId, groupName);
      }}
      onDeleteGroup={(groupId, groupName) => {
        void handleDeleteGroup(groupId, groupName);
      }}
      onReorderGroups={(nextGroups) => {
        void handleGroupReorder(nextGroups);
      }}
      onCreateGroup={(event) => {
        void handleCreateGroup(event);
      }}
      onNewGroupNameChange={(event) => setNewGroupName(event.target.value)}
      onCreateNote={() => {
        void createNote();
      }}
      onSearchQueryChange={(event) => setSearchQuery(event.target.value)}
      onClearSearch={() => setSearchQuery("")}
      onSelectNote={selectNote}
      onDeleteNote={(noteId) => {
        void deleteNote(noteId);
      }}
      onMoveNoteGroup={(note, groupId) => {
        void handleMoveNoteGroup(note, groupId);
      }}
      onReorderNotes={(nextNotes) => {
        if (isSearchActive) return;
        void handleNoteReorder(nextNotes);
      }}
      onTitleChange={handleTitleChange}
      onContentChange={handleContentChange}
      onMoveSelectedNoteGroup={(groupId) => {
        void handleMoveSelectedNoteGroup(groupId);
      }}
      onRetrySave={() => {
        void handleRetrySave();
      }}
      onOpenConflictDialog={() => setDialogMode("conflict")}
      onCopy={() => {
        void handleCopy();
      }}
      onDialogPrimaryAction={() => {
        void handleDialogPrimaryAction();
      }}
      onDialogDiscardAction={() => {
        void handleDialogDiscardAction();
      }}
      onDialogCancelAction={handleDialogCancelAction}
      shareInfo={shareInfo}
      shareLoading={shareLoading}
      onShareToggle={handleShareToggle}
    />
  );

}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
  mobileTabs: {
    display: "flex",
    gap: "8px",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
  },
  mobileTabButton: {
    flex: 1,
    minHeight: "44px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    background: "var(--color-bg)",
    fontWeight: 600,
  },
  mobileTabButtonActive: {
    background: "var(--color-primary)",
    color: "var(--color-brand-contrast)",
    borderColor: "var(--color-primary)",
  },
  sidebar: {
    width: "180px",
    flexShrink: 0,
    background: "var(--color-surface)",
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "12px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutBtn: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: "2px 4px",
  },
  userInfo: {
    padding: "8px 12px",
    fontSize: "12px",
    color: "var(--color-text-secondary)",
    borderBottom: "1px solid var(--color-border)",
  },
  groupSectionHeader: {
    padding: "8px 12px 4px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
  },
  groupSection: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 0",
    minHeight: 0,
  },
  groupRow: {
    display: "flex",
    alignItems: "center",
    margin: "1px 4px",
    borderRadius: "4px",
  },
  activeGroup: {
    background: "var(--color-primary)",
    color: "var(--color-brand-contrast)",
  },
  groupSelectButton: {
    flex: 1,
    minHeight: "44px",
    padding: "8px 12px",
    textAlign: "left",
    color: "inherit",
    fontSize: "13px",
  },
  iconBtn: {
    background: "none",
    color: "inherit",
    opacity: 0.7,
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "48px",
    minHeight: "44px",
  },
  groupActionButtons: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    paddingRight: "4px",
  },
  newGroupForm: {
    flexShrink: 0,
    display: "flex",
    padding: "8px",
    borderTop: "1px solid var(--color-border)",
    gap: "4px",
  },
  groupInput: {
    flex: 1,
    minWidth: 0,
    padding: "4px 6px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontSize: "12px",
    outline: "none",
  },
  addBtn: {
    minWidth: "44px",
    minHeight: "44px",
    background: "var(--color-primary)",
    color: "var(--color-brand-contrast)",
    border: "none",
    borderRadius: "var(--radius)",
    cursor: "pointer",
    fontWeight: 700,
  },
  noteList: {
    width: "248px",
    flexShrink: 0,
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--color-bg)",
  },
  noteListHeader: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--color-surface)",
  },
  noteListBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },
  noteListMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  reorderHint: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
  },
  newNoteBtn: {
    fontSize: "12px",
    minHeight: "44px",
    padding: "4px 12px",
    background: "var(--color-primary)",
    color: "var(--color-brand-contrast)",
    border: "none",
    borderRadius: "var(--radius)",
    cursor: "pointer",
  },
  noteSearchRow: {
    display: "flex",
    gap: "8px",
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
  },
  noteSearchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: "40px",
    padding: "8px 10px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
    fontSize: "13px",
    outline: "none",
  },
  noteSearchClearBtn: {
    minHeight: "40px",
    padding: "8px 12px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    background: "var(--color-bg)",
    color: "var(--color-text-secondary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  empty: {
    padding: "20px 12px",
    color: "var(--color-text-secondary)",
    fontSize: "13px",
    textAlign: "center",
  },
  noteItem: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border)",
    cursor: "pointer",
    background: "var(--color-surface)",
  },
  noteRow: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: "8px",
  },
  noteSelectButton: {
    minWidth: 0,
    flex: 1,
    textAlign: "left",
    padding: "0",
    minHeight: "44px",
  },
  activeNote: {
    background: "var(--color-bg-accent-soft)",
    borderLeft: "3px solid var(--color-primary)",
    color: "var(--color-text-primary)",
  },
  noteTitle: {
    fontWeight: 500,
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "var(--color-text-primary)",
  },
  noteDate: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
    marginTop: "2px",
  },
  noteActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  },
  noteActionsCompact: {
    gap: "2px",
  },
  noteGroupMoveRow: {
    marginTop: "8px",
  },
  noteGroupMoveSelect: {
    width: "100%",
    minHeight: "36px",
    padding: "4px 8px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
    fontSize: "12px",
  },
  orderBtn: {
    background: "none",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    color: "var(--color-text-secondary)",
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "44px",
    minHeight: "44px",
  },
  orderBtnCompact: {
    minWidth: "28px",
    minHeight: "28px",
    fontSize: "11px",
  },
  deleteBtn: {
    background: "none",
    border: "1px solid transparent",
    borderRadius: "var(--radius)",
    color: "var(--color-text-secondary)",
    fontSize: "16px",
    lineHeight: 1,
    minWidth: "44px",
    minHeight: "44px",
  },
  deleteBtnCompact: {
    minWidth: "28px",
    minHeight: "28px",
    fontSize: "14px",
  },
  editor: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  editorToolbar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    padding: "8px 16px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    gap: "12px",
  },
  titleInput: {
    flex: 1,
    minWidth: "180px",
    border: "none",
    outline: "none",
    fontSize: "16px",
    fontWeight: 600,
    background: "transparent",
    color: "var(--color-text-primary)",
  },
  groupPicker: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  groupPickerLabel: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
  },
  groupPickerSelect: {
    minHeight: "36px",
    padding: "4px 8px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
    marginLeft: "auto",
  },
  statusBadge: {
    fontSize: "12px",
  },
  charCount: {
    fontSize: "12px",
    color: "var(--color-text-secondary)",
  },
  secondaryActionBtn: {
    minHeight: "36px",
    padding: "4px 10px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontSize: "12px",
    fontWeight: 600,
  },
  copyBtn: {
    minHeight: "44px",
    padding: "4px 12px",
    color: "var(--color-brand-contrast)",
    border: "none",
    borderRadius: "var(--radius)",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
  },
  textarea: {
    flex: 1,
    padding: "16px",
    border: "none",
    outline: "none",
    resize: "none",
    fontSize: "14px",
    lineHeight: 1.7,
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
  },
  noNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "var(--color-text-secondary)",
    fontSize: "14px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.44)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    zIndex: 1000,
  },
  modalCard: {
    width: "min(720px, 100%)",
    background: "var(--color-surface)",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--color-text-primary)",
  },
  modalDescription: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: "var(--color-text-secondary)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },
  modalPrimaryButton: {
    minHeight: "44px",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "none",
    background: "var(--color-primary)",
    color: "var(--color-brand-contrast)",
    fontWeight: 700,
  },
  modalSecondaryButton: {
    minHeight: "44px",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
    fontWeight: 600,
  },
  modalGhostButton: {
    minHeight: "44px",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--color-text-secondary)",
    fontWeight: 600,
  },
  conflictGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
  },
  conflictPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    borderRadius: "12px",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
  },
  conflictPanelTitle: {
    fontSize: "13px",
    color: "var(--color-text-primary)",
  },
  conflictPanelMeta: {
    fontSize: "12px",
    color: "var(--color-text-secondary)",
  },
  conflictPanelBody: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: "220px",
    overflowY: "auto",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "var(--color-text-primary)",
  },
};
