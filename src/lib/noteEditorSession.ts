import type { Note } from "./api";
import type { SaveStatus, MobilePanel } from "../pages/notesPageDerivations";

export type CopyStatus = "ready" | "copy-success" | "copy-error";
export type CountStatus = "count-ready" | "count-stale";
export type DialogMode = "transition" | "conflict" | null;

type ClearedNoteEditorStateArgs = {
  isMobile: boolean;
};

type OpenedNoteEditorStateArgs = {
  note: Note;
  isMobile: boolean;
};

export function getClearedNoteEditorState({ isMobile }: ClearedNoteEditorStateArgs) {
  return {
    selectedNote: null,
    title: "",
    content: "",
    saveStatus: "saved" as SaveStatus,
    copyStatus: "ready" as CopyStatus,
    countStatus: "count-ready" as CountStatus,
    conflictNote: null,
    pendingAction: null,
    dialogMode: null as DialogMode,
    mobilePanel: isMobile ? ("notes" as MobilePanel) : null,
  };
}

export function getOpenedNoteEditorState({ note, isMobile }: OpenedNoteEditorStateArgs) {
  return {
    selectedNote: note,
    title: note.title,
    content: note.content,
    saveStatus: "saved" as SaveStatus,
    copyStatus: "ready" as CopyStatus,
    countStatus: "count-stale" as CountStatus,
    conflictNote: null,
    pendingAction: null,
    dialogMode: null as DialogMode,
    mobilePanel: isMobile ? ("editor" as MobilePanel) : null,
  };
}
