import { useRef } from "react";
import { ApiError, api, type Note } from "../lib/api";
import { copyText } from "../lib/editorProductivity";
import type { CountStatus, CopyStatus } from "../lib/noteEditorSession";
import {
  createSerializedAutoSaveRunner,
  type SerializedAutoSaveRunner,
} from "../lib/noteAutoSave";
import { cloneNotes } from "../lib/noteCache";
import type { SaveStatus } from "./notesPageDerivations";

type NoteSaveSnapshot = {
  noteId: string;
  title: string;
  content: string;
  expectedUpdatedAt: string | null;
};

type UseNotePersistenceArgs = {
  selectedNote: Note | null;
  saveStatus: SaveStatus;
  content: string;
  selectedNoteIdRef: React.MutableRefObject<string | null>;
  selectedNoteUpdatedAtRef: React.MutableRefObject<string | null>;
  titleRef: React.MutableRefObject<string>;
  contentRef: React.MutableRefObject<string>;
  conflictNoteRef: React.MutableRefObject<Note | null>;
  notesCacheRef: React.MutableRefObject<Map<string, Note[]>>;
  currentScopeKeyRef: React.MutableRefObject<string>;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
  setCopyStatus: React.Dispatch<React.SetStateAction<CopyStatus>>;
  setCountStatus: React.Dispatch<React.SetStateAction<CountStatus>>;
  setConflictNote: React.Dispatch<React.SetStateAction<Note | null>>;
  setDialogMode: React.Dispatch<React.SetStateAction<"transition" | "conflict" | null>>;
  updateNoteAcrossCaches: (note: Note) => void;
};

export function isConflictNoteData(data: unknown): data is Note {
  if (typeof data !== "object" || data === null) return false;

  return (
    "id" in data &&
    "title" in data &&
    "content" in data &&
    "group_id" in data &&
    "sort_order" in data &&
    "updated_at" in data
  );
}

export function shouldScheduleAutoSave(
  selectedNote: Note | null,
  saveStatus: SaveStatus
) {
  return Boolean(selectedNote && selectedNote.deleted_at == null && saveStatus !== "conflict");
}

export function useNotePersistence({
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
}: UseNotePersistenceArgs) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRunnerRef = useRef<SerializedAutoSaveRunner | null>(null);

  function cancelScheduledSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  function resetPersistenceSession() {
    cancelScheduledSave();
    autoSaveRunnerRef.current?.reset();
    autoSaveRunnerRef.current = null;
  }

  function createNoteAutoSaveRunner(noteId: string) {
    return createSerializedAutoSaveRunner({
      readSnapshot: () => {
        if (selectedNoteIdRef.current !== noteId) return null;

        return {
          noteId,
          title: titleRef.current,
          content: contentRef.current,
          expectedUpdatedAt: selectedNoteUpdatedAtRef.current,
        };
      },
      run: (snapshot) => performNoteSave(snapshot),
    });
  }

  function activateAutoSaveRunner(noteId: string) {
    autoSaveRunnerRef.current = createNoteAutoSaveRunner(noteId);
  }

  async function performNoteSave(snapshot: NoteSaveSnapshot, force = false) {
    const {
      noteId,
      title: draftTitle,
      content: draftContent,
      expectedUpdatedAt,
    } = snapshot;

    setSaveStatus("saving");

    try {
      const updated = await api.notes.update(noteId, {
        title: draftTitle,
        content: draftContent,
        updated_at: expectedUpdatedAt ?? undefined,
        force,
      });

      setNotes((prev) => {
        const nextNotes = prev.map((note) => (note.id === noteId ? updated : note));
        notesCacheRef.current.set(currentScopeKeyRef.current, cloneNotes(nextNotes));
        return nextNotes;
      });
      updateNoteAcrossCaches(updated);

      if (selectedNoteIdRef.current !== noteId) {
        return true;
      }

      selectedNoteUpdatedAtRef.current = updated.updated_at;
      setSelectedNote(updated);
      conflictNoteRef.current = null;
      setConflictNote(null);

      const draftStillCurrent =
        titleRef.current === draftTitle && contentRef.current === draftContent;
      setSaveStatus(draftStillCurrent ? "saved" : "dirty");
      return true;
    } catch (error) {
      if (selectedNoteIdRef.current !== noteId) {
        return false;
      }

      if (
        error instanceof ApiError &&
        error.code === "CONFLICT" &&
        isConflictNoteData(error.data)
      ) {
        updateNoteAcrossCaches(error.data);
        setNotes((prev) => prev.map((note) => (note.id === noteId ? error.data : note)));
        setSelectedNote(error.data);
        selectedNoteUpdatedAtRef.current = error.data.updated_at;
        conflictNoteRef.current = error.data;
        setConflictNote(error.data);
        setSaveStatus("conflict");
        setDialogMode("conflict");
        return false;
      }

      setSaveStatus("error");
      return false;
    }
  }

  async function persistCurrentNote(force = false) {
    const noteId = selectedNoteIdRef.current;
    if (!noteId) return true;

    cancelScheduledSave();

    if (force) {
      return performNoteSave({
        noteId,
        title: titleRef.current,
        content: contentRef.current,
        expectedUpdatedAt:
          conflictNoteRef.current?.updated_at ?? selectedNoteUpdatedAtRef.current,
      }, true);
    }

    if (!autoSaveRunnerRef.current) {
      autoSaveRunnerRef.current = createNoteAutoSaveRunner(noteId);
    }

    return autoSaveRunnerRef.current.requestRun();
  }

  function scheduleAutoSave(noteId: string) {
    cancelScheduledSave();
    setSaveStatus("dirty");

    if (autoSaveRunnerRef.current?.isRunning()) {
      void autoSaveRunnerRef.current.requestRun();
      return;
    }

    saveTimerRef.current = setTimeout(async () => {
      if (selectedNoteIdRef.current !== noteId) return;
      await persistCurrentNote();
    }, 800);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setTitle(value);
    titleRef.current = value;
    setCountStatus("count-ready");
    const currentNote = selectedNote;
    if (currentNote && shouldScheduleAutoSave(currentNote, saveStatus)) {
      scheduleAutoSave(currentNote.id);
    }
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);
    contentRef.current = value;
    setCountStatus("count-ready");
    const currentNote = selectedNote;
    if (currentNote && shouldScheduleAutoSave(currentNote, saveStatus)) {
      scheduleAutoSave(currentNote.id);
    }
  }

  async function handleCopy() {
    const result = await copyText(
      typeof navigator !== "undefined" ? navigator.clipboard : null,
      content
    );

    setCopyStatus(result === "success" ? "copy-success" : "copy-error");
    setTimeout(() => setCopyStatus("ready"), 2000);
  }

  return {
    cancelScheduledSave,
    resetPersistenceSession,
    activateAutoSaveRunner,
    persistCurrentNote,
    handleTitleChange,
    handleContentChange,
    handleCopy,
  };
}
