import type { Note } from "./api";
import type { SaveStatus } from "../pages/notesPageDerivations";
import { TRASH_NOTES_SCOPE_KEY } from "./noteCache";

export type PendingAction =
  | { type: "select-note"; note: Note }
  | { type: "select-group"; groupId: string | null }
  | { type: "create-note" }
  | { type: "delete-note"; noteId: string }
  | { type: "move-note-group"; noteId: string; groupId: string | null }
  | { type: "logout" };

export function hasBlockingEdits(
  selectedNote: Note | null,
  saveStatus: SaveStatus
) {
  return Boolean(
    selectedNote &&
    (saveStatus === "dirty" || saveStatus === "error" || saveStatus === "conflict")
  );
}

export function getTransitionDialogMode(saveStatus: SaveStatus) {
  return saveStatus === "conflict" ? "conflict" : "transition";
}

export function shouldClearSelectedNoteOnGroupSelection(
  groupId: string | null,
  selectedNote: Note | null
) {
  if (!selectedNote) return false;
  if (groupId === TRASH_NOTES_SCOPE_KEY) {
    return selectedNote.deleted_at == null;
  }
  if (selectedNote.deleted_at != null) {
    return true;
  }
  return Boolean(groupId !== null && selectedNote.group_id !== groupId);
}

export function getNextMobilePanelAfterGroupSelection(isMobile: boolean) {
  return isMobile ? "notes" : null;
}

export function shouldRevealMobileNotesPanelForGroupSelection(args: {
  isMobile: boolean;
  selectedGroupId: string | null;
  nextGroupId: string | null;
}) {
  return args.isMobile && args.nextGroupId === args.selectedGroupId;
}

export function getNextMobilePanelAfterNoteSelection(isMobile: boolean) {
  return isMobile ? "editor" : null;
}

export function shouldRevealMobileEditorForNoteSelection(args: {
  isMobile: boolean;
  selectedNote: Note | null;
  nextNote: Note;
}) {
  return args.isMobile && args.nextNote.id === args.selectedNote?.id;
}

export function shouldOpenTransitionForGroupSelection(args: {
  selectedGroupId: string | null;
  nextGroupId: string | null;
  selectedNote: Note | null;
  saveStatus: SaveStatus;
}) {
  if (args.nextGroupId === args.selectedGroupId) return false;
  return hasBlockingEdits(args.selectedNote, args.saveStatus);
}

export function shouldOpenTransitionForNoteSelection(args: {
  selectedNote: Note | null;
  nextNote: Note;
  saveStatus: SaveStatus;
}) {
  if (args.nextNote.id === args.selectedNote?.id) return false;
  return hasBlockingEdits(args.selectedNote, args.saveStatus);
}
