import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SortableNoteList } from "../src/components/SortableNoteList";
import {
  buildSearchPreview,
  findMatchRange,
  splitHighlightSegments,
} from "../src/lib/noteSearchHighlight";
import type { Note } from "../src/lib/api";

describe("FEATURE-011 note search highlight utilities", () => {
  it("finds a case-insensitive match range", () => {
    expect(findMatchRange("Book Seoul hotel", "seoUL")).toEqual({
      start: 5,
      end: 10,
    });
  });

  it("splits matching text into highlight segments", () => {
    expect(splitHighlightSegments("Sprint Plan", "plan")).toEqual([
      { text: "Sprint ", highlighted: false },
      { text: "Plan", highlighted: true },
    ]);
  });

  it("builds a trimmed content preview around the first match", () => {
    expect(buildSearchPreview("Remember to book the Seoul hotel soon", "Seoul", 8)).toEqual({
      text: "the Seoul hotel",
      matchStart: 4,
      matchEnd: 9,
      hasLeadingEllipsis: true,
      hasTrailingEllipsis: true,
    });
  });
});

describe("FEATURE-011 note search highlight rendering", () => {
  it("renders highlighted title and matched content preview in the note list", () => {
    const markup = renderToStaticMarkup(
      <SortableNoteList
        notes={[buildNote()]}
        groups={[]}
        defaultGroupId={null}
        selectedNoteId={null}
        isMobile={false}
        searchQuery="seoul"
        onSelectNote={() => {}}
        onDeleteNote={() => {}}
        onRestoreNote={() => {}}
        onPermanentDeleteNote={() => {}}
        onMoveNoteGroup={() => {}}
        onReorder={() => {}}
      />
    );

    expect(markup).toContain("Trip to ");
    expect(markup).toContain("Seoul");
    expect(markup).toContain("Remember to book the ");
    expect(markup).toContain("hotel soon");
    expect(markup).toContain("background:color-mix");
  });
});

function buildNote(): Note {
  return {
    id: "note-1",
    title: "Trip to Seoul",
    content: "Remember to book the Seoul hotel soon",
    group_id: null,
    sort_order: 0,
    updated_at: "2026-04-22T00:00:00.000Z",
  };
}
