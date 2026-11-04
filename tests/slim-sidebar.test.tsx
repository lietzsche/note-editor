import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { NotesPageLayout } from "../src/components/NotesPageLayout";
import { SortableNoteList } from "../src/components/SortableNoteList";
import { styles } from "../src/pages/notesPageStyles";

const noop = () => {};
const props: ComponentProps<typeof NotesPageLayout> = {
  styles, isMobile: false, mobilePanel: "notes", setMobilePanel: noop,
  showGroupsPanel: true, showNotesPanel: true, showEditorPanel: true,
  username: "tester", groups: [], selectedGroupId: null, isTrashView: false,
  currentGroupLabel: "전체 노트", defaultGroupId: null, defaultGroupName: "미분류",
  groupListStatusLabel: "", noteListStatusLabel: "", notes: [], totalNotesCount: 0,
  notesLoadState: "ready", selectedNote: null, searchQuery: "", selectedNoteGroupValue: "",
  title: "", content: "", saveLabel: "저장됨", saveStatus: "saved",
  selectedNoteDeletedAtLabel: null, charCount: 0, countStatus: "count-ready",
  newGroupName: "", groupReorderBusy: false, noteReorderBusy: false,
  dialogMode: null, dialogTitle: "", dialogDescription: "", primaryDialogLabel: "",
  isConflictDialog: false, conflictNote: null, hasPendingAction: false,
  perfDebugEnabled: false, perfSamples: [], onLogout: noop, onOpenGuide: noop,
  onOpenAccountSecurity: noop, onSelectGroup: noop, onRenameGroup: noop,
  onDeleteGroup: noop, onReorderGroups: noop, onCreateGroup: noop,
  onNewGroupNameChange: noop, onCreateNote: noop, onSearchQueryChange: noop,
  onClearSearch: noop, onSelectNote: noop, onDeleteNote: noop, onRestoreNote: noop,
  onPermanentDeleteNote: noop, onMoveNoteGroup: noop, onReorderNotes: noop,
  onTitleChange: noop, onContentChange: noop, onMoveSelectedNoteGroup: noop,
  onRetrySave: noop, onOpenConflictDialog: noop, onCopy: noop,
  onDialogPrimaryAction: noop, onDialogDiscardAction: noop, onDialogCancelAction: noop,
  shareInfo: null, shareLoading: false, shareError: null, onShareToggle: noop,
  zenMode: false, onToggleZenMode: noop, onToggleSidebar: noop,
};

describe("slim desktop sidebar", () => {
  it("keeps navigation, group management and account actions in one desktop panel", () => {
    const html = renderToStaticMarkup(<NotesPageLayout {...props} />);
    expect(html).not.toContain("<aside");
    expect(html).toContain('aria-label="탐색할 그룹 선택"');
    expect(html).toContain("그룹 관리</summary>");
    expect(html).toContain('aria-label="새 그룹 이름"');
    expect(html).toContain('aria-label="새 노트 만들기"');
    expect(html).toContain("slim-sidebar__account-popover");
    expect(html).toContain('aria-label="계정 보안"');
    expect(html).toContain('aria-label="로그아웃"');
  });

  it("retains the separate mobile group screen", () => {
    const html = renderToStaticMarkup(
      <NotesPageLayout {...props} isMobile mobilePanel="groups" showNotesPanel={false} showEditorPanel={false} />
    );
    expect(html).toContain("<aside");
    expect(html).not.toContain('aria-label="탐색할 그룹 선택"');
    expect(html).toContain("노트 그룹");
    expect(html).toContain('aria-label="새 그룹 이름"');
  });

  it("uses a compact menu on desktop while retaining mobile drag and delete controls", () => {
    const note = { id: "n1", title: "기록", content: "본문", group_id: null,
      sort_order: 0, updated_at: "2026-11-01T00:00:00Z" };
    const listProps = { notes: [note], groups: [], defaultGroupId: null, selectedNoteId: null,
      onSelectNote: noop, onDeleteNote: noop, onRestoreNote: noop,
      onPermanentDeleteNote: noop, onReorder: noop };
    const desktop = renderToStaticMarkup(<SortableNoteList {...listProps} isMobile={false} />);
    expect(desktop).toContain('aria-label="기록 노트 더보기"');
    expect(desktop).not.toContain('aria-label="기록 노트 순서 변경"');
    expect(desktop).not.toContain('aria-label="기록 노트 삭제"');
    const mobile = renderToStaticMarkup(<SortableNoteList {...listProps} isMobile />);
    expect(mobile).toContain('aria-label="기록 노트 순서 변경"');
    expect(mobile).toContain('aria-label="기록 노트 삭제"');
    expect(mobile).not.toContain('aria-label="기록 노트 더보기"');
    const trash = renderToStaticMarkup(<SortableNoteList {...listProps} isMobile={false} mode="trash" />);
    expect(trash).toContain('aria-label="기록 노트 복원"');
    expect(trash).not.toContain('aria-label="기록 노트 더보기"');
  });

  it("adds a normal preview while keeping deleted timestamps and restore actions", () => {
    const note = { id: "n1", title: "기록", content: "첫 문장\n다음 문장", group_id: null,
      sort_order: 0, updated_at: "2026-11-01T00:00:00Z", deleted_at: "2026-11-02T00:00:00Z" };
    const listProps = { notes: [note], groups: [], defaultGroupId: null, selectedNoteId: null,
      isMobile: false, onSelectNote: noop, onDeleteNote: noop, onRestoreNote: noop,
      onPermanentDeleteNote: noop, onReorder: noop };
    const active = renderToStaticMarkup(<SortableNoteList {...listProps} />);
    expect(active).toContain("첫 문장 다음 문장");
    expect(active).not.toContain("삭제됨");
    const trash = renderToStaticMarkup(<SortableNoteList {...listProps} mode="trash" />);
    expect(trash).toContain("삭제됨");
    expect(trash).toContain('aria-label="기록 노트 복원"');
  });
});
