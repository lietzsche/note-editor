import { useCallback } from "react";
import { api, type Note } from "../lib/api";
import { sortNotesByOrder } from "../lib/noteCollections";
import type { PendingAction } from "../lib/notesPageTransitions";

type ShareInfo = {
  share_token: string | null;
  is_active: boolean;
  expires_at: string | null;
  access_count: number;
  share_url: string | null;
} | null;

type UseNoteActionsArgs = {
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
  openNote: (note: Note) => void;
  loadNotes: (groupId?: string, options?: { preferCache?: boolean }) => Promise<Note[]>;
  applyCreatedNoteToCaches: (note: Note) => void;
  setNotesForScope: (groupId: string | null, nextNotes: Note[]) => void;
  removeNoteFromCaches: (noteId: string) => void;
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

export function useNoteActions({
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
    const note = await api.notes.create({
      title: "새 노트",
      group_id: selectedGroupId ?? undefined,
    });
    applyCreatedNoteToCaches(note);
    setNotesForScope(selectedGroupId, sortNotesByOrder([...notes, note]));
    openNote(note);
  }, [applyCreatedNoteToCaches, notes, openNote, selectedGroupId, setNotesForScope]);

  const createNote = useCallback(async () => {
    if (hasBlockingEdits()) {
      openTransitionDialog({ type: "create-note" });
      return;
    }
    await createNoteImmediately();
  }, [createNoteImmediately, hasBlockingEdits, openTransitionDialog]);

  const deleteNote = useCallback(async (id: string) => {
    if (!window.confirm("노트를 삭제할까요?")) return;
    await api.notes.delete(id);
    const nextNotes = notes.filter((note) => note.id !== id);
    removeNoteFromCaches(id);
    setNotesForScope(selectedGroupId, nextNotes);
    if (selectedNote?.id === id) {
      clearSelectedNoteView();
    }
  }, [clearSelectedNoteView, notes, removeNoteFromCaches, selectedGroupId, selectedNote, setNotesForScope]);

  const handleShareToggle = useCallback(async () => {
    if (!selectedNote || shareLoading) return;
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
      setShareError(error instanceof Error ? error.message : "공유 설정 변경에 실패했습니다.");
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
      window.alert(error instanceof Error ? error.message : "그룹 생성에 실패했습니다.");
    }
  }, [newGroupName, setNewGroupName, upsertGroup]);

  const handleRenameGroup = useCallback(async (id: string, currentName: string) => {
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
  }, [upsertGroup]);

  const handleDeleteGroup = useCallback(async (id: string, name: string) => {
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

    if (!targetNote) return;
    if (groupId === targetNote.group_id) return;

    try {
      const previousGroupId = targetNote.group_id;
      const updatedNote = await api.notes.moveGroup(noteId, groupId);
      applyMovedNoteToCaches(updatedNote, previousGroupId);

      const nextNotes = getNextNotesAfterMove({
        notes,
        selectedGroupId,
        updatedNote,
        noteId,
      });

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
  }, [
    applyMovedNoteToCaches,
    clearSelectedNoteView,
    notes,
    openNote,
    selectedGroupId,
    selectedNote,
    setNotesForScope,
  ]);

  const handleMoveNoteGroup = useCallback(async (note: Note, groupId: string | null) => {
    if (groupId === note.group_id) return;

    if (selectedNote?.id === note.id && hasBlockingEdits()) {
      openTransitionDialog({ type: "move-note-group", noteId: note.id, groupId });
      return;
    }

    await moveNoteGroupImmediately(note.id, groupId);
  }, [hasBlockingEdits, moveNoteGroupImmediately, openTransitionDialog, selectedNote]);

  const handleMoveSelectedNoteGroup = useCallback(async (groupId: string | null) => {
    if (!selectedNote) return;
    await handleMoveNoteGroup(selectedNote, groupId);
  }, [handleMoveNoteGroup, selectedNote]);

  return {
    createNoteImmediately,
    createNote,
    deleteNote,
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
