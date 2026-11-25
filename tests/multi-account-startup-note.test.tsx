import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { AccountSwitcherSection } from "../src/components/AccountSwitcher";
import {
  NotesPageLayout,
  shouldCloseAccountMenuOnBlur,
} from "../src/components/NotesPageLayout";
import { SortableNoteList } from "../src/components/SortableNoteList";
import { styles } from "../src/pages/notesPageStyles";

const noop = () => {};

function createLayoutProps(
  overrides: Partial<ComponentProps<typeof NotesPageLayout>> = {}
): ComponentProps<typeof NotesPageLayout> {
  return {
    styles,
    isMobile: false,
    mobilePanel: "notes",
    setMobilePanel: noop,
    showGroupsPanel: true,
    showNotesPanel: true,
    showEditorPanel: true,
    username: "personal",
    accounts: [
      { userId: "u1", username: "personal", isActive: true },
      { userId: "u2", username: "work", isActive: false },
    ],
    startupNoteId: "n1",
    groups: [],
    selectedGroupId: null,
    isTrashView: false,
    currentGroupLabel: "전체 노트",
    defaultGroupId: null,
    defaultGroupName: "미분류",
    groupListStatusLabel: "",
    noteListStatusLabel: "",
    notes: [],
    totalNotesCount: 0,
    notesLoadState: "ready",
    selectedNote: null,
    searchQuery: "",
    selectedNoteGroupValue: "",
    title: "",
    content: "",
    saveLabel: "저장됨",
    saveStatus: "saved",
    selectedNoteDeletedAtLabel: null,
    charCount: 0,
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
    autoFocusMode: false,
    autoFocusEnabled: true,
    onAutoFocusEnabledChange: noop,
    onSwitchAccount: noop,
    onRequestAddAccount: noop,
    onLogoutAll: noop,
    ...overrides,
  };
}

describe("AccountSwitcherSection", () => {
  it("renders signed-in accounts, active badge, add-account button, and logout-all when 2+ accounts exist", () => {
    const html = renderToStaticMarkup(
      <AccountSwitcherSection
        accounts={[
          { userId: "u1", username: "personal", isActive: true },
          { userId: "u2", username: "work", isActive: false },
        ]}
        onSwitchAccount={noop}
        onRequestAddAccount={noop}
        onLogoutAll={noop}
      />
    );

    expect(html).toContain("2/5");
    expect(html).toContain("@personal");
    expect(html).toContain("사용 중");
    expect(html).toContain("@work");
    expect(html).toContain("+ 다른 계정 로그인");
    expect(html).toContain("모든 계정 로그아웃");
  });

  it("hides logout-all for single account and disables add-account at 5 accounts", () => {
    const singleHtml = renderToStaticMarkup(
      <AccountSwitcherSection
        accounts={[{ userId: "u1", username: "personal", isActive: true }]}
        onSwitchAccount={noop}
        onRequestAddAccount={noop}
        onLogoutAll={noop}
      />
    );
    expect(singleHtml).not.toContain("모든 계정 로그아웃");

    const fullHtml = renderToStaticMarkup(
      <AccountSwitcherSection
        accounts={[
          { userId: "u1", username: "a1", isActive: true },
          { userId: "u2", username: "a2", isActive: false },
          { userId: "u3", username: "a3", isActive: false },
          { userId: "u4", username: "a4", isActive: false },
          { userId: "u5", username: "a5", isActive: false },
        ]}
        onSwitchAccount={noop}
        onRequestAddAccount={noop}
      />
    );
    expect(fullHtml).toContain("5/5");
    expect(fullHtml).toContain('class="account-switcher__addBtn" disabled=""');
  });
});

describe("Startup note UI", () => {
  it("shows a startup badge only on the configured startup note in SortableNoteList", () => {
    const html = renderToStaticMarkup(
      <SortableNoteList
        notes={[
          { id: "n1", title: "데일리 노트", content: "내용", group_id: null, sort_order: 0, updated_at: "2026-11-24T00:00:00Z" },
          { id: "n2", title: "일반 노트", content: "내용", group_id: null, sort_order: 1, updated_at: "2026-11-24T00:00:00Z" },
        ]}
        groups={[]}
        defaultGroupId={null}
        selectedNoteId={null}
        startupNoteId="n1"
        isMobile={false}
        onSelectNote={noop}
        onDeleteNote={noop}
        onRestoreNote={noop}
        onPermanentDeleteNote={noop}
        onToggleStartupNote={noop}
        onReorder={noop}
      />
    );

    expect(html).toContain("startup-note-badge");
    expect(html).toContain("시작");
  });

  it("shows multi-account count and switcher inside desktop account popover", () => {
    const html = renderToStaticMarkup(<NotesPageLayout {...createLayoutProps()} />);
    expect(html).toContain("@personal (2)");
    expect(html).toContain("다중 계정 전환");
    expect(html).toContain("@work");
  });
});

describe("Desktop account popover auto-focus label click regression", () => {
  it("does not close the popover when blur has relatedTarget=null (clicking label text)", () => {
    const fakeNode = {} as Node;
    expect(shouldCloseAccountMenuOnBlur(() => false, null)).toBe(false);
    expect(shouldCloseAccountMenuOnBlur(() => true, fakeNode)).toBe(false);
    expect(shouldCloseAccountMenuOnBlur(() => false, fakeNode)).toBe(true);
  });
});
