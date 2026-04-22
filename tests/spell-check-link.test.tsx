import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NotesPageLayout } from "../src/components/NotesPageLayout";
import { SpellCheckLink } from "../src/components/SpellCheckLink";
import {
  SPELL_CHECK_GUIDANCE,
  SPELL_CHECK_TOOLTIP,
} from "../src/lib/externalLinks";
import type { Group, Note } from "../src/lib/api";

describe("FEATURE-010 spell check helper", () => {
  it("renders a helper button and copy guidance", () => {
    const markup = renderToStaticMarkup(<SpellCheckLink content="A short note." />);

    expect(markup).toContain(`title="${SPELL_CHECK_TOOLTIP}"`);
    expect(markup).toContain('aria-label="맞춤법 검사 도우미 열기"');
    expect(markup).toContain("맞춤법 검사");
    expect(markup).toContain(SPELL_CHECK_GUIDANCE);
  });

  it("shows chunk guidance for longer content", () => {
    const markup = renderToStaticMarkup(
      <SpellCheckLink content={"문장 ".repeat(300)} />
    );

    expect(markup).toContain("현재 문서는");
  });
});

describe("FEATURE-010 editor toolbar integration", () => {
  it("renders the spell check helper in the editor toolbar", () => {
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
        onShareToggle={() => {}}
      />
    );

    expect(markup).toContain("맞춤법 검사");
    expect(markup).toContain(SPELL_CHECK_GUIDANCE);
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
        onShareToggle={() => {}}
      />
    );

    expect(markup).toContain("search");
    expect(markup).toContain("body");
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
