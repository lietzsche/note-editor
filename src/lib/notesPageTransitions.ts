import type { Note } from "./api";
import type { SaveStatus } from "../pages/notesPageDerivations";

export type PendingAction =
  | { type: "select-note"; note: Note }
  | { type: "select-group"; groupId: string | null }
  | { type: "create-note" }
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
  return Boolean(groupId !== null && selectedNote && selectedNote.group_id !== groupId);
}

export function getNextMobilePanelAfterGroupSelection(isMobile: boolean) {
  return isMobile ? "notes" : null;
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
