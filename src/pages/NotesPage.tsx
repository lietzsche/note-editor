import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  type AdminPasswordResetAuditEntry,
  type AdminPasswordResetResult,
  type AdminUser,
  type Note,
} from "../lib/api";
import { AccountSecurityPanel } from "../components/AccountSecurityPanel";
import { AdminConsolePanel } from "../components/AdminConsolePanel";
import { NotesPageLayout } from "../components/NotesPageLayout";
import { countGraphemes } from "../lib/editorProductivity";
import {
  getClearedNoteEditorState,
  getOpenedNoteEditorState,
  type CopyStatus,
  type CountStatus,
} from "../lib/noteEditorSession";
import {
  getNextMobilePanelAfterNoteSelection,
  getNextMobilePanelAfterGroupSelection,
  getTransitionDialogMode,
  hasBlockingEdits as hasBlockingEditsForNote,
  shouldClearSelectedNoteOnGroupSelection,
  shouldOpenTransitionForGroupSelection,
  shouldOpenTransitionForNoteSelection,
  shouldRevealMobileEditorForNoteSelection,
  shouldRevealMobileNotesPanelForGroupSelection,
  type PendingAction,
} from "../lib/notesPageTransitions";
import { TRASH_NOTES_SCOPE_KEY } from "../lib/noteCache";
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
import { styles } from "./notesPageStyles";
import { useNoteActions } from "./useNoteActions";
import { useNotesData } from "./useNotesData";
import { useNotePersistence } from "./useNotePersistence";

type Props = {
  username: string;
  passwordChangeRequired: boolean;
  onPasswordChangeRequiredChange: (required: boolean) => void;
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

export default function NotesPage({
  username,
  passwordChangeRequired,
  onPasswordChangeRequiredChange,
  onLogout,
}: Props) {
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
  const [shareError, setShareError] = useState<string | null>(null);
  const [adminCapability, setAdminCapability] = useState<"checking" | "available" | "unavailable">("checking");
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [isAccountSecurityOpen, setIsAccountSecurityOpen] = useState(false);
  const [accountSecurityBusy, setAccountSecurityBusy] = useState(false);
  const [accountSecurityError, setAccountSecurityError] = useState<string | null>(null);
  const [accountSecuritySuccess, setAccountSecuritySuccess] = useState<string | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const deferredAdminSearchQuery = useDeferredValue(adminSearchQuery);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);
  const [adminAuditEntries, setAdminAuditEntries] = useState<AdminPasswordResetAuditEntry[]>([]);
  const [adminAuditLoading, setAdminAuditLoading] = useState(false);
  const [adminAuditError, setAdminAuditError] = useState<string | null>(null);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [pendingAdminResetUserId, setPendingAdminResetUserId] = useState<string | null>(null);
  const [adminResetBusyUserId, setAdminResetBusyUserId] = useState<string | null>(null);
  const [adminResetResult, setAdminResetResult] = useState<AdminPasswordResetResult | null>(null);
  const [adminPasswordCopyState, setAdminPasswordCopyState] = useState<"idle" | "success" | "error">("idle");
  const [adminUsersReloadKey, setAdminUsersReloadKey] = useState(0);
  const [adminAuditReloadKey, setAdminAuditReloadKey] = useState(0);
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
    moveNoteToTrashInCaches,
    applyCreatedNoteToCaches,
    applyMovedNoteToCaches,
    restoreNoteFromTrashInCaches,
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
  const {
    createNoteImmediately,
    createNote,
    trashNoteImmediately,
    deleteNote,
    restoreNote,
    permanentDeleteNote,
    handleShareToggle,
    logoutImmediately,
    handleLogout,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    moveNoteGroupImmediately,
    handleMoveNoteGroup,
    handleMoveSelectedNoteGroup,
  } = useNoteActions({
    notes,
    selectedNote,
    selectedGroupId,
    shareInfo,
    shareLoading,
    newGroupName,
    onLogout,
    hasBlockingEdits,
    openTransitionDialog,
    clearSelectedNoteView,
    openNote,
    loadNotes,
    applyCreatedNoteToCaches,
    setNotesForScope,
    removeNoteFromCaches,
    moveNoteToTrashInCaches,
    restoreNoteFromTrashInCaches,
    upsertGroup,
    removeGroup,
    invalidateAllNotesCache,
    applyMovedNoteToCaches,
    setSelectedGroupId,
    setNewGroupName,
    setShareInfo,
    setShareLoading,
    setShareError,
  });
  const defaultGroup = groups.find((group) => group.name === DEFAULT_GROUP_NAME) ?? null;
  const defaultGroupId = defaultGroup?.id ?? null;
  const isAdminUser = adminCapability === "available";
  const isSelectedNoteReadOnly = selectedNote?.deleted_at != null;

  useEffect(() => {
    if (passwordChangeRequired) {
      setIsAccountSecurityOpen(true);
      setAccountSecurityError(null);
      setAccountSecuritySuccess(null);
    }
  }, [passwordChangeRequired]);

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
    let cancelled = false;

    setAdminUsersLoading(true);
    api.admin.listUsers({ limit: 8 })
      .then((users) => {
        if (cancelled) return;
        setAdminCapability("available");
        setAdminUsers(users);
        setAdminUsersError(null);
      })
      .catch((error) => {
        if (cancelled) return;

        if (error instanceof ApiError && (
          error.code === "FORBIDDEN" ||
          error.code === "UNAUTHORIZED"
        )) {
          setAdminCapability("unavailable");
          setAdminUsers([]);
          setAdminUsersError(null);
          return;
        }

        setAdminCapability("unavailable");
        setAdminUsers([]);
        setAdminUsersError(error instanceof Error ? error.message : "운영 권한을 확인하지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) {
          setAdminUsersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAdminUser || !isAdminConsoleOpen) return undefined;

    let cancelled = false;
    setAdminUsersLoading(true);
    setAdminUsersError(null);

    api.admin.listUsers({
      search: deferredAdminSearchQuery.trim() || undefined,
      limit: deferredAdminSearchQuery.trim() ? 12 : 8,
    })
      .then((users) => {
        if (!cancelled) {
          setAdminUsers(users);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setAdminUsers([]);
        setAdminUsersError(error instanceof Error ? error.message : "사용자 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) {
          setAdminUsersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredAdminSearchQuery, adminUsersReloadKey, isAdminConsoleOpen, isAdminUser]);

  useEffect(() => {
    if (!isAdminUser || !isAdminConsoleOpen) return undefined;

    let cancelled = false;
    setAdminAuditLoading(true);
    setAdminAuditError(null);

    api.admin.listPasswordResetAudit(8)
      .then((entries) => {
        if (!cancelled) {
          setAdminAuditEntries(entries);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setAdminAuditEntries([]);
        setAdminAuditError(error instanceof Error ? error.message : "감사 이력을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) {
          setAdminAuditLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adminAuditReloadKey, isAdminConsoleOpen, isAdminUser]);

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
    if (adminPasswordCopyState === "idle") return undefined;

    const timer = setTimeout(() => {
      setAdminPasswordCopyState("idle");
    }, 2000);

    return () => clearTimeout(timer);
  }, [adminPasswordCopyState]);

  useEffect(() => {
    if (!selectedNote) {
      setShareInfo(null);
      setShareError(null);
      return;
    }
    if (selectedNote.deleted_at != null) {
      setShareInfo(null);
      setShareError(null);
      setShareLoading(false);
      return;
    }
    setShareError(null);
    setShareLoading(true);
    api.notes.share.get(selectedNote.id)
      .then((info) => {
        setShareInfo(info);
      })
      .catch(() => {
        setShareInfo(null);
        setShareError("공유 상태를 불러오지 못했습니다.");
      })
      .finally(() => {
        setShareLoading(false);
      });
  }, [selectedNote?.deleted_at, selectedNote?.id]);

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
    if (groupId === TRASH_NOTES_SCOPE_KEY) return "휴지통";
    return groups.find((group) => group.id === groupId)?.name ?? "그룹";
  }

  function openAdminConsole() {
    setIsAdminConsoleOpen(true);
    setAdminActionError(null);
  }

  function openAccountSecurity() {
    setIsAccountSecurityOpen(true);
    setAccountSecurityError(null);
    setAccountSecuritySuccess(null);
  }

  function closeAccountSecurity() {
    if (passwordChangeRequired) return;
    setIsAccountSecurityOpen(false);
    setAccountSecurityError(null);
    setAccountSecuritySuccess(null);
  }

  function closeAdminConsole() {
    setIsAdminConsoleOpen(false);
    setAdminSearchQuery("");
    setPendingAdminResetUserId(null);
    setAdminActionError(null);
    setAdminResetResult(null);
    setAdminPasswordCopyState("idle");
  }

  async function handleChangePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }) {
    setAccountSecurityBusy(true);
    setAccountSecurityError(null);
    setAccountSecuritySuccess(null);

    try {
      await api.auth.changePassword(payload.currentPassword, payload.newPassword);
      onPasswordChangeRequiredChange(false);
      setAccountSecuritySuccess("비밀번호를 변경했습니다. 현재 세션만 유지되고 다른 세션은 로그아웃됩니다.");
      if (passwordChangeRequired) {
        setIsAccountSecurityOpen(false);
      }
    } catch (error) {
      setAccountSecurityError(
        error instanceof Error ? error.message : "비밀번호를 변경하지 못했습니다."
      );
    } finally {
      setAccountSecurityBusy(false);
    }
  }

  async function handleAdminPasswordReset(userId: string) {
    setAdminResetBusyUserId(userId);
    setAdminActionError(null);

    try {
      const result = await api.admin.resetPassword(userId);
      setAdminResetResult(result);
      setPendingAdminResetUserId(null);
      setAdminPasswordCopyState("idle");
      setAdminUsersReloadKey((prev) => prev + 1);
      setAdminAuditReloadKey((prev) => prev + 1);
    } catch (error) {
      setAdminActionError(error instanceof Error ? error.message : "비밀번호를 초기화하지 못했습니다.");
    } finally {
      setAdminResetBusyUserId(null);
    }
  }

  async function handleAdminPasswordCopy() {
    if (!adminResetResult || typeof navigator === "undefined" || !navigator.clipboard) {
      setAdminPasswordCopyState("error");
      return;
    }

    try {
      await navigator.clipboard.writeText(adminResetResult.tempPassword);
      setAdminPasswordCopyState("success");
    } catch {
      setAdminPasswordCopyState("error");
    }
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
    if (shouldRevealMobileNotesPanelForGroupSelection({
      isMobile,
      selectedGroupId,
      nextGroupId: groupId,
    })) {
      setMobilePanel("notes");
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
    if (note.deleted_at == null) {
      activateAutoSaveRunner(note.id);
    }
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
    if (shouldRevealMobileEditorForNoteSelection({
      isMobile,
      selectedNote,
      nextNote: note,
    })) {
      const nextMobilePanel = getNextMobilePanelAfterNoteSelection(isMobile);
      if (nextMobilePanel) {
        setMobilePanel(nextMobilePanel);
      }
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

    if (action.type === "delete-note") {
      await trashNoteImmediately(action.noteId);
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
    isTrashView,
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
  const effectiveSaveLabel = isSelectedNoteReadOnly ? "읽기 전용" : saveLabel;
  const deletedAtLabel = selectedNote?.deleted_at
    ? new Date(selectedNote.deleted_at).toLocaleString("ko-KR")
    : null;

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
    <>
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
        isTrashView={isTrashView}
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
        saveLabel={effectiveSaveLabel}
        saveStatus={saveStatus}
        selectedNoteDeletedAtLabel={deletedAtLabel}
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
        showAdminConsoleButton={isAdminUser}
        passwordChangeRequired={passwordChangeRequired}
        onLogout={handleLogout}
        onOpenAccountSecurity={openAccountSecurity}
        onOpenAdminConsole={openAdminConsole}
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
        onRestoreNote={(noteId) => {
          void restoreNote(noteId);
        }}
        onPermanentDeleteNote={(noteId) => {
          void permanentDeleteNote(noteId);
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
        shareError={shareError}
        onShareToggle={handleShareToggle}
      />
      <AccountSecurityPanel
        isOpen={isAccountSecurityOpen}
        required={passwordChangeRequired}
        username={username}
        submitting={accountSecurityBusy}
        errorMessage={accountSecurityError}
        successMessage={accountSecuritySuccess}
        onClose={closeAccountSecurity}
        onLogout={() => {
          void handleLogout();
        }}
        onSubmit={(payload) => {
          void handleChangePassword(payload);
        }}
      />
      <AdminConsolePanel
        isOpen={isAdminConsoleOpen}
        currentUsername={username}
        searchQuery={adminSearchQuery}
        users={adminUsers}
        usersLoading={adminUsersLoading}
        usersError={adminUsersError}
        auditEntries={adminAuditEntries}
        auditLoading={adminAuditLoading}
        auditError={adminAuditError}
        actionError={adminActionError}
        pendingResetUserId={pendingAdminResetUserId}
        resetBusyUserId={adminResetBusyUserId}
        resetResult={adminResetResult}
        passwordCopyState={adminPasswordCopyState}
        onClose={closeAdminConsole}
        onSearchQueryChange={setAdminSearchQuery}
        onRequestReset={setPendingAdminResetUserId}
        onCancelReset={() => setPendingAdminResetUserId(null)}
        onConfirmReset={(userId) => {
          void handleAdminPasswordReset(userId);
        }}
        onCopyPassword={() => {
          void handleAdminPasswordCopy();
        }}
        onDismissResetResult={() => setAdminResetResult(null)}
      />
    </>
  );

}

