import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { NotesPageLayout } from "../src/components/NotesPageLayout";
import { styles } from "../src/pages/notesPageStyles";
import type { Note } from "../src/lib/api";

const noop = () => {};
const sampleNote: Note = {
  id: "test-note-1",
  title: "테스트 노트",
  content: "본문 내용입니다.",
  group_id: null,
  sort_order: 0,
  updated_at: "2026-11-06T00:00:00.000Z",
};

const baseProps: ComponentProps<typeof NotesPageLayout> = {
  styles,
  isMobile: false,
  mobilePanel: "notes",
  setMobilePanel: noop,
  showGroupsPanel: true,
  showNotesPanel: true,
  showEditorPanel: true,
  username: "tester",
  groups: [],
  selectedGroupId: null,
  isTrashView: false,
  currentGroupLabel: "전체 노트",
  defaultGroupId: null,
  defaultGroupName: "미분류",
  groupListStatusLabel: "",
  noteListStatusLabel: "",
  notes: [sampleNote],
  totalNotesCount: 1,
  notesLoadState: "ready",
  selectedNote: sampleNote,
  searchQuery: "",
  selectedNoteGroupValue: "",
  title: sampleNote.title,
  content: sampleNote.content,
  saveLabel: "저장됨",
  saveStatus: "saved",
  selectedNoteDeletedAtLabel: null,
  charCount: 9,
  countStatus: "count-ready",
  newGroupName: "",
  groupReorderBusy: false,
  noteReorderBusy: false,
  dialogMode: null,
  dialogTitle: "",
  dialogDescription: "",
  primaryDialogLabel: "",
  isConflictDialog: false,
  conflictNote: null,
  hasPendingAction: false,
  perfDebugEnabled: false,
  perfSamples: [],
  onLogout: noop,
  onOpenGuide: noop,
  onOpenAccountSecurity: noop,
  onSelectGroup: noop,
  onRenameGroup: noop,
  onDeleteGroup: noop,
  onReorderGroups: noop,
  onCreateGroup: noop,
  onNewGroupNameChange: noop,
  onCreateNote: noop,
  onSearchQueryChange: noop,
  onClearSearch: noop,
  onSelectNote: noop,
  onDeleteNote: noop,
  onRestoreNote: noop,
  onPermanentDeleteNote: noop,
  onMoveNoteGroup: noop,
  onReorderNotes: noop,
  onTitleChange: noop,
  onContentChange: noop,
  onMoveSelectedNoteGroup: noop,
  onRetrySave: noop,
  onOpenConflictDialog: noop,
  onCopy: noop,
  onDialogPrimaryAction: noop,
  onDialogDiscardAction: noop,
  onDialogCancelAction: noop,
  shareInfo: null,
  shareLoading: false,
  shareError: null,
  onShareToggle: noop,
  zenMode: false,
  onToggleZenMode: noop,
  onToggleSidebar: noop,
};

describe("FEATURE editor markdown toolbar integration", () => {
  it("renders markdown toolbar when a note is selected and not in zen mode", () => {
    const handleApply = vi.fn();
    const html = renderToStaticMarkup(
      <NotesPageLayout
        {...baseProps}
        onApplyMarkdownFormat={handleApply}
      />
    );

    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="마크다운 서식 도구"');
    expect(html).toContain('aria-label="굵게"');
  });

  it("hides markdown toolbar when zenMode is true", () => {
    const handleApply = vi.fn();
    const html = renderToStaticMarkup(
      <NotesPageLayout
        {...baseProps}
        zenMode={true}
        onApplyMarkdownFormat={handleApply}
      />
    );

    expect(html).not.toContain('role="toolbar"');
  });

  it("hides markdown toolbar for deleted/read-only note", () => {
    const handleApply = vi.fn();
    const deletedNote: Note = {
      ...sampleNote,
      deleted_at: "2026-11-06T00:00:00.000Z",
    };

    const html = renderToStaticMarkup(
      <NotesPageLayout
        {...baseProps}
        selectedNote={deletedNote}
        onApplyMarkdownFormat={handleApply}
      />
    );

    expect(html).not.toContain('role="toolbar"');
  });
});
