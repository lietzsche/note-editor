import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NotesPageLayout } from "../src/components/NotesPageLayout";
import { SpellCheckLink } from "../src/components/SpellCheckLink";
import {
  SPELL_CHECK_GUIDANCE,
  SPELL_CHECK_TOOLTIP,
  SPELL_CHECK_URL,
} from "../src/lib/externalLinks";
import type { Group, Note } from "../src/lib/api";

describe("FEATURE-010 spell check link", () => {
  it("renders the external spell check link with secure target attributes", () => {
    const markup = renderToStaticMarkup(<SpellCheckLink />);

    expect(markup).toContain(`href="${SPELL_CHECK_URL}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain(`title="${SPELL_CHECK_TOOLTIP}"`);
    expect(markup).toContain('aria-label="맞춤법 검사 새 탭에서 열기"');
    expect(markup).toContain("맞춤법 검사");
  });

  it("shows the copy-paste guidance text", () => {
    const markup = renderToStaticMarkup(<SpellCheckLink />);

    expect(markup).toContain(SPELL_CHECK_GUIDANCE);
  });
});

describe("FEATURE-010 editor toolbar integration", () => {
  it("renders the spell check link in the editor toolbar", () => {
    const markup = renderToStaticMarkup(
      <NotesPageLayout
        styles={buildStyles()}
        isMobile={false}
        mobilePanel="editor"
        setMobilePanel={() => {}}
        showGroupsPanel={false}
        showNotesPanel={false}
        showEditorPanel
        username="tester"
        groups={buildGroups()}
        selectedGroupId={null}
        currentGroupLabel="all notes"
        defaultGroupId={null}
        defaultGroupName="default"
        groupListStatusLabel=""
        noteListStatusLabel=""
        notes={buildNotes()}
        totalNotesCount={1}
        notesLoadState="ready"
        selectedNote={buildNote()}
        searchQuery=""
        selectedNoteGroupValue=""
        title="title"
        content="body"
        saveLabel="saved"
        saveStatus="saved"
        charCount={4}
        countStatus="count-ready"
        copyStatus="ready"
        newGroupName=""
        groupReorderBusy={false}
        noteReorderBusy={false}
        dialogMode={null}
        dialogTitle=""
        dialogDescription=""
        primaryDialogLabel=""
        isConflictDialog={false}
        conflictNote={null}
        hasPendingAction={false}
        perfDebugEnabled={false}
        perfSamples={[]}
        onLogout={() => {}}
        onOpenAccountSecurity={() => {}}
        onSelectGroup={() => {}}
        onRenameGroup={() => {}}
        onDeleteGroup={() => {}}
        onReorderGroups={() => {}}
        onCreateGroup={(event) => event.preventDefault()}
        onNewGroupNameChange={() => {}}
        onCreateNote={() => {}}
        onSearchQueryChange={() => {}}
        onClearSearch={() => {}}
        onSelectNote={() => {}}
        onDeleteNote={() => {}}
        onMoveNoteGroup={() => {}}
        onReorderNotes={() => {}}
        onTitleChange={() => {}}
        onContentChange={() => {}}
        onMoveSelectedNoteGroup={() => {}}
        onRetrySave={() => {}}
        onOpenConflictDialog={() => {}}
        onCopy={() => {}}
        onDialogPrimaryAction={() => {}}
        onDialogDiscardAction={() => {}}
        onDialogCancelAction={() => {}}
        shareInfo={null}
        shareLoading={false}
        shareError={null}
        onShareToggle={() => {}}
      />
    );

    expect(markup).toContain("맞춤법 검사");
    expect(markup).toContain(SPELL_CHECK_URL);
  });
});

describe("FEATURE-011 note search", () => {
  it("renders the note search input in the note list header", () => {
    const markup = renderToStaticMarkup(
      <NotesPageLayout
        styles={buildStyles()}
        isMobile={false}
        mobilePanel="notes"
        setMobilePanel={() => {}}
        showGroupsPanel={false}
        showNotesPanel
        showEditorPanel={false}
        username="tester"
        groups={buildGroups()}
        selectedGroupId={null}
        currentGroupLabel="all notes"
        defaultGroupId={null}
        defaultGroupName="default"
        groupListStatusLabel=""
        noteListStatusLabel="1 result"
        notes={buildNotes()}
        totalNotesCount={1}
        notesLoadState="ready"
        selectedNote={buildNote()}
        searchQuery="body"
        selectedNoteGroupValue=""
        title="title"
        content="body"
        saveLabel="saved"
        saveStatus="saved"
        charCount={4}
        countStatus="count-ready"
        copyStatus="ready"
        newGroupName=""
        groupReorderBusy={false}
        noteReorderBusy={false}
        dialogMode={null}
        dialogTitle=""
        dialogDescription=""
        primaryDialogLabel=""
        isConflictDialog={false}
        conflictNote={null}
        hasPendingAction={false}
        perfDebugEnabled={false}
        perfSamples={[]}
        onLogout={() => {}}
        onOpenAccountSecurity={() => {}}
        onSelectGroup={() => {}}
        onRenameGroup={() => {}}
        onDeleteGroup={() => {}}
        onReorderGroups={() => {}}
        onCreateGroup={(event) => event.preventDefault()}
        onNewGroupNameChange={() => {}}
        onCreateNote={() => {}}
        onSearchQueryChange={() => {}}
        onClearSearch={() => {}}
        onSelectNote={() => {}}
        onDeleteNote={() => {}}
        onMoveNoteGroup={() => {}}
        onReorderNotes={() => {}}
        onTitleChange={() => {}}
        onContentChange={() => {}}
        onMoveSelectedNoteGroup={() => {}}
        onRetrySave={() => {}}
        onOpenConflictDialog={() => {}}
        onCopy={() => {}}
        onDialogPrimaryAction={() => {}}
        onDialogDiscardAction={() => {}}
        onDialogCancelAction={() => {}}
        shareInfo={null}
        shareLoading={false}
        shareError={null}
        onShareToggle={() => {}}
      />
    );

    expect(markup).toContain("search");
    expect(markup).toContain("body");
  });

  it("keeps highlighted search context visible in the editor for the selected note", () => {
    const note = {
      ...buildNote(),
      title: "Trip to Seoul",
      content: "Remember to book the Seoul hotel soon",
    };

    const markup = renderToStaticMarkup(
      <NotesPageLayout
        styles={buildStyles()}
        isMobile={false}
        mobilePanel="editor"
        setMobilePanel={() => {}}
        showGroupsPanel={false}
        showNotesPanel={false}
        showEditorPanel
        username="tester"
        groups={buildGroups()}
        selectedGroupId={null}
        currentGroupLabel="all notes"
        defaultGroupId={null}
        defaultGroupName="default"
        groupListStatusLabel=""
        noteListStatusLabel=""
        notes={[note]}
        totalNotesCount={1}
        notesLoadState="ready"
        selectedNote={note}
        searchQuery="seoul"
        selectedNoteGroupValue=""
        title={note.title}
        content={note.content}
        saveLabel="saved"
        saveStatus="saved"
        charCount={note.content.length}
        countStatus="count-ready"
        copyStatus="ready"
        newGroupName=""
        groupReorderBusy={false}
        noteReorderBusy={false}
        dialogMode={null}
        dialogTitle=""
        dialogDescription=""
        primaryDialogLabel=""
        isConflictDialog={false}
        conflictNote={null}
        hasPendingAction={false}
        perfDebugEnabled={false}
        perfSamples={[]}
        onLogout={() => {}}
        onOpenAccountSecurity={() => {}}
        onSelectGroup={() => {}}
        onRenameGroup={() => {}}
        onDeleteGroup={() => {}}
        onReorderGroups={() => {}}
        onCreateGroup={(event) => event.preventDefault()}
        onNewGroupNameChange={() => {}}
        onCreateNote={() => {}}
        onSearchQueryChange={() => {}}
        onClearSearch={() => {}}
        onSelectNote={() => {}}
        onDeleteNote={() => {}}
        onRestoreNote={() => {}}
        onPermanentDeleteNote={() => {}}
        onMoveNoteGroup={() => {}}
        onReorderNotes={() => {}}
        onTitleChange={() => {}}
        onContentChange={() => {}}
        onMoveSelectedNoteGroup={() => {}}
        onRetrySave={() => {}}
        onOpenConflictDialog={() => {}}
        onCopy={() => {}}
        onDialogPrimaryAction={() => {}}
        onDialogDiscardAction={() => {}}
        onDialogCancelAction={() => {}}
        shareInfo={null}
        shareLoading={false}
        shareError={null}
        onShareToggle={() => {}}
      />
    );

    expect(markup).toContain("SEARCH MATCH");
    expect(markup).toContain("Trip to Seoul");
    expect(markup).toContain("Remember to book the Seoul hotel soon");
  });
});

function buildNote(): Note {
  return {
    id: "note-1",
    title: "title",
    content: "body",
    group_id: null,
    sort_order: 0,
    updated_at: "2026-04-22T00:00:00.000Z",
  };
}

function buildNotes(): Note[] {
  return [buildNote()];
}

function buildGroups(): Group[] {
  return [];
}

function buildStyles() {
  return new Proxy(
    {},
    {
      get: () => ({}),
    }
  ) as Record<string, React.CSSProperties>;
}
