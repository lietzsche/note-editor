import { useCallback } from "react";
import { api, type Group, type Note } from "../lib/api";
import { TRASH_NOTES_SCOPE_KEY } from "../lib/noteCache";
import { sortNotesByOrder } from "../lib/noteCollections";
import type { PendingAction } from "../lib/notesPageTransitions";
import { getErrorMessage, showToast } from "../lib/toastStore";

type ShareInfo = {
  share_token: string | null;
  is_active: boolean;
  expires_at: string | null;
  access_count: number;
  share_url: string | null;
} | null;

type UseNoteActionsArgs = {
  groups: Group[];
  notes: Note[];
  selectedNote: Note | null;
  selectedGroupId: string | null;
  shareInfo: ShareInfo;
  shareLoading: boolean;
  newGroupName: string;
  onLogout: () => void;
  hasBlockingEdits: () => boolean;
  openTransitionDialog: (action: PendingAction) => void;
  clearSelectedNoteView: () => void;
  openNote: (note: Note, options?: { isNewlyCreated?: boolean }) => void;
  loadNotes: (groupId?: string, options?: { preferCache?: boolean }) => Promise<Note[]>;
  applyCreatedNoteToCaches: (note: Note) => void;
  setNotesForScope: (groupId: string | null, nextNotes: Note[]) => void;
  updateNoteAcrossCaches: (note: Note) => void;
  removeNoteFromCaches: (noteId: string) => void;
  moveNoteToTrashInCaches: (note: Note) => void;
  restoreNoteFromTrashInCaches: (note: Note) => void;
  upsertGroup: (group: { id: string; name: string; position: number }) => void;
  removeGroup: (groupId: string) => void;
  invalidateAllNotesCache: () => void;
  applyMovedNoteToCaches: (note: Note, previousGroupId: string | null) => void;
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  setNewGroupName: React.Dispatch<React.SetStateAction<string>>;
  setShareInfo: React.Dispatch<React.SetStateAction<ShareInfo>>;
  setShareLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setShareError: React.Dispatch<React.SetStateAction<string | null>>;
};

export function getNextNotesAfterMove(args: {
  notes: Note[];
  selectedGroupId: string | null;
  updatedNote: Note;
  noteId: string;
}) {
  return args.selectedGroupId !== null && args.updatedNote.group_id !== args.selectedGroupId
    ? args.notes.filter((note) => note.id !== args.noteId)
    : args.notes.map((note) => (note.id === args.updatedNote.id ? args.updatedNote : note));
}

export function getTrashToastMessage(title: string | null | undefined) {
  const normalizedTitle = (title ?? "").trim();
  if (!normalizedTitle) return "노트를 휴지통으로 이동했습니다.";
  const shortTitle = normalizedTitle.length > 20 ? `${normalizedTitle.slice(0, 20)}…` : normalizedTitle;
  return `'${shortTitle}' 노트를 휴지통으로 이동했습니다.`;
}

export function useNoteActions({
  groups,
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
  updateNoteAcrossCaches,
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
}: UseNoteActionsArgs) {
  const createNoteImmediately = useCallback(async () => {
    if (selectedGroupId === TRASH_NOTES_SCOPE_KEY) return;

    const note = await api.notes.create({
      title: "제목 없음",
      group_id: selectedGroupId ?? undefined,
    });
    applyCreatedNoteToCaches(note);
    setNotesForScope(selectedGroupId, sortNotesByOrder([...notes, note]));
    openNote(note, { isNewlyCreated: true });
  }, [applyCreatedNoteToCaches, notes, openNote, selectedGroupId, setNotesForScope]);

  const createNote = useCallback(async () => {
    if (selectedGroupId === TRASH_NOTES_SCOPE_KEY) return;
    if (hasBlockingEdits()) {
      openTransitionDialog({ type: "create-note" });
      return;
    }
    await createNoteImmediately();
  }, [createNoteImmediately, hasBlockingEdits, openTransitionDialog, selectedGroupId]);

  const trashNoteImmediately = useCallback(async (noteId: string) => {
    const targetNote = selectedNote?.id === noteId
      ? selectedNote
      : notes.find((note) => note.id === noteId);

    const optimisticTrashedNote: Note | null = targetNote
      ? { ...targetNote, deleted_at: new Date().toISOString() }
      : null;

    if (optimisticTrashedNote) {
      moveNoteToTrashInCaches(optimisticTrashedNote);
    } else {
      removeNoteFromCaches(noteId);
    }

    if (selectedNote?.id === noteId) {
      clearSelectedNoteView();
    }

    try {
      await api.notes.delete(noteId);
    } catch (error) {
      if (targetNote) {
        restoreNoteFromTrashInCaches(targetNote);
      }
      showToast({ tone: "error", message: getErrorMessage(error, "노트를 휴지통으로 이동하지 못했습니다.") });
      return;
    }

    if (!optimisticTrashedNote) {
      showToast({ message: "노트를 휴지통으로 이동했습니다." });
      return;
    }

    const trashedNote = optimisticTrashedNote;
    showToast({
      message: getTrashToastMessage(trashedNote.title),
      action: {
        label: "되돌리기",
        onAction: () => {
          void undoTrash(trashedNote);
        },
      },
    });

    async function undoTrash(note: Note) {
      restoreNoteFromTrashInCaches({ ...note, deleted_at: null });
      try {
        const restoredNote = await api.notes.restore(note.id);
        updateNoteAcrossCaches(restoredNote);
        showToast({ tone: "success", message: "노트를 복원했습니다." });
      } catch (error) {
        moveNoteToTrashInCaches(note);
        showToast({ tone: "error", message: getErrorMessage(error, "노트를 복원하지 못했습니다.") });
      }
    }
  }, [
    clearSelectedNoteView,
    moveNoteToTrashInCaches,
    notes,
    removeNoteFromCaches,
    restoreNoteFromTrashInCaches,
    selectedNote,
    updateNoteAcrossCaches,
  ]);

  const deleteNote = useCallback(async (id: string) => {
    const targetNote = selectedNote?.id === id
      ? selectedNote
      : notes.find((note) => note.id === id);

    if (!targetNote || targetNote.deleted_at != null) return;

    if (selectedNote?.id === id && hasBlockingEdits()) {
      openTransitionDialog({ type: "delete-note", noteId: id });
      return;
    }

    await trashNoteImmediately(id);
  }, [hasBlockingEdits, notes, openTransitionDialog, selectedNote, trashNoteImmediately]);

  const restoreNote = useCallback(async (id: string) => {
    const targetNote = selectedNote?.id === id
      ? selectedNote
      : notes.find((note) => note.id === id);

    if (targetNote) {
      restoreNoteFromTrashInCaches({ ...targetNote, deleted_at: null });
    }
    if (selectedNote?.id === id) {
      clearSelectedNoteView();
    }

    try {
      const restoredNote = await api.notes.restore(id);
      if (targetNote) {
        updateNoteAcrossCaches(restoredNote);
      } else {
        restoreNoteFromTrashInCaches(restoredNote);
      }
    } catch (error) {
      if (targetNote) {
        moveNoteToTrashInCaches(targetNote);
      }
      showToast({ tone: "error", message: getErrorMessage(error, "노트를 복원하지 못했습니다.") });
    }
  }, [
    clearSelectedNoteView,
    moveNoteToTrashInCaches,
    notes,
    restoreNoteFromTrashInCaches,
    selectedNote,
    updateNoteAcrossCaches,
  ]);

  const permanentDeleteNote = useCallback(async (id: string) => {
    const targetNote = selectedNote?.id === id
      ? selectedNote
      : notes.find((note) => note.id === id);

    removeNoteFromCaches(id);
    if (selectedNote?.id === id) {
      clearSelectedNoteView();
    }

    try {
      await api.notes.permanentDelete(id);
    } catch (error) {
      if (targetNote) {
        moveNoteToTrashInCaches(targetNote);
      }
      showToast({ tone: "error", message: getErrorMessage(error, "노트를 영구 삭제하지 못했습니다.") });
    }
  }, [clearSelectedNoteView, moveNoteToTrashInCaches, notes, removeNoteFromCaches, selectedNote]);

  const handleShareToggle = useCallback(async () => {
    if (!selectedNote || selectedNote.deleted_at != null || shareLoading) return;
    setShareError(null);
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
      console.error("공유 설정 변경 실패:", error);
      setShareError(error instanceof Error ? error.message : "공유 설정을 변경하지 못했습니다.");
    } finally {
      setShareLoading(false);
    }
  }, [selectedNote, shareLoading, shareInfo, setShareError, setShareInfo, setShareLoading]);

  const logoutImmediately = useCallback(async () => {
    await api.auth.logout();
    onLogout();
  }, [onLogout]);

  const handleLogout = useCallback(async () => {
    if (hasBlockingEdits()) {
      openTransitionDialog({ type: "logout" });
      return;
    }
    await logoutImmediately();
  }, [hasBlockingEdits, logoutImmediately, openTransitionDialog]);

  const handleCreateGroup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const createdGroup = await api.groups.create(newGroupName.trim());
      setNewGroupName("");
      upsertGroup(createdGroup);
    } catch (error) {
      showToast({ tone: "error", message: getErrorMessage(error, "그룹을 만들지 못했습니다.") });
    }
  }, [newGroupName, setNewGroupName, upsertGroup]);

  const handleRenameGroup = useCallback(async (id: string, nextName: string) => {
    const normalizedName = nextName.trim();
    if (!normalizedName) return;

    const existingGroup = groups.find((group) => group.id === id);
    if (existingGroup) {
      upsertGroup({ ...existingGroup, name: normalizedName });
    }

    try {
      const updatedGroup = await api.groups.update(id, normalizedName);
      upsertGroup(updatedGroup);
    } catch (error) {
      if (existingGroup) {
        upsertGroup(existingGroup);
      }
      showToast({ tone: "error", message: getErrorMessage(error, "그룹 이름을 변경하지 못했습니다.") });
    }
  }, [groups, upsertGroup]);

  const handleDeleteGroup = useCallback(async (id: string) => {
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
      showToast({ tone: "error", message: getErrorMessage(error, "그룹을 삭제하지 못했습니다.") });
    }
  }, [
    invalidateAllNotesCache,
    loadNotes,
    openNote,
    removeGroup,
    selectedGroupId,
    selectedNote,
    setSelectedGroupId,
  ]);

  const moveNoteGroupImmediately = useCallback(async (noteId: string, groupId: string | null) => {
    const targetNote = selectedNote?.id === noteId
      ? selectedNote
      : notes.find((note) => note.id === noteId);

    if (!targetNote || targetNote.deleted_at != null) return;
    if (groupId === targetNote.group_id) return;

    const previousGroupId = targetNote.group_id;
    const previousNotes = notes;
    const optimisticNote: Note = { ...targetNote, group_id: groupId };

    applyMovedNoteToCaches(optimisticNote, previousGroupId);
    setNotesForScope(
      selectedGroupId,
      getNextNotesAfterMove({
        notes: previousNotes,
        selectedGroupId,
        updatedNote: optimisticNote,
        noteId,
      })
    );

    if (selectedNote?.id === noteId) {
      if (selectedGroupId !== null && optimisticNote.group_id !== selectedGroupId) {
        clearSelectedNoteView();
      } else {
        openNote(optimisticNote);
      }
    }

    try {
      const updatedNote = await api.notes.moveGroup(noteId, groupId);
      applyMovedNoteToCaches(updatedNote, groupId);
      updateNoteAcrossCaches(updatedNote);
    } catch (error) {
      applyMovedNoteToCaches(targetNote, groupId);
      setNotesForScope(selectedGroupId, previousNotes);
      if (selectedNote?.id === noteId) {
        openNote(targetNote);
      }
      showToast({ tone: "error", message: getErrorMessage(error, "노트 그룹을 이동하지 못했습니다.") });
    }
  }, [
    applyMovedNoteToCaches,
    clearSelectedNoteView,
    notes,
    openNote,
    selectedGroupId,
    selectedNote,
    setNotesForScope,
    updateNoteAcrossCaches,
  ]);

  const handleMoveNoteGroup = useCallback(async (note: Note, groupId: string | null) => {
    if (note.deleted_at != null || groupId === note.group_id) return;

    if (selectedNote?.id === note.id && hasBlockingEdits()) {
      openTransitionDialog({ type: "move-note-group", noteId: note.id, groupId });
      return;
    }

    await moveNoteGroupImmediately(note.id, groupId);
  }, [hasBlockingEdits, moveNoteGroupImmediately, openTransitionDialog, selectedNote]);

  const handleMoveSelectedNoteGroup = useCallback(async (groupId: string | null) => {
    if (!selectedNote || selectedNote.deleted_at != null) return;
    await handleMoveNoteGroup(selectedNote, groupId);
  }, [handleMoveNoteGroup, selectedNote]);

  return {
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
  };
}
