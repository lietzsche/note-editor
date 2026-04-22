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

describe("FEATURE-010 맞춤법 검사 링크", () => {
  it("외부 맞춤법 검사 링크를 새 탭 보안 속성과 함께 렌더링한다", () => {
    const markup = renderToStaticMarkup(<SpellCheckLink />);

    expect(markup).toContain(`href="${SPELL_CHECK_URL}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain(`title="${SPELL_CHECK_TOOLTIP}"`);
    expect(markup).toContain('aria-label="맞춤법 검사 새 탭에서 열기"');
    expect(markup).toContain("맞춤법 검사");
  });

  it("사용자에게 복사 후 붙여넣기 안내를 제공한다", () => {
    const markup = renderToStaticMarkup(<SpellCheckLink />);

    expect(markup).toContain(SPELL_CHECK_GUIDANCE);
  });
});

describe("FEATURE-010 에디터 툴바 통합", () => {
  it("노트 편집 툴바에서 맞춤법 검사 링크를 노출한다", () => {
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
        currentGroupLabel="전체 노트"
        defaultGroupId={null}
        defaultGroupName="기본"
        groupListStatusLabel=""
        noteListStatusLabel=""
        notes={buildNotes()}
        notesLoadState="ready"
        selectedNote={buildNote()}
        selectedNoteGroupValue=""
        title="제목"
        content="본문"
        saveLabel="저장됨"
        saveStatus="saved"
        charCount={2}
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
    expect(markup).toContain(SPELL_CHECK_URL);
  });
});

function buildNote(): Note {
  return {
    id: "note-1",
    title: "제목",
    content: "본문",
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
