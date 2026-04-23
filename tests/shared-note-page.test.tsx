import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SharedNote } from "../src/lib/api";
import { SharedNoteView } from "../src/pages/SharedNotePage";

describe("SharedNoteView", () => {
  it("renders a themed loading state for public note links", () => {
    const markup = renderToStaticMarkup(<SharedNoteView state={{ kind: "loading" }} />);

    expect(markup).toContain("shared-shell");
    expect(markup).toContain("role=\"status\"");
    expect(markup).toContain("노트를 불러오는 중입니다");
  });

  it("renders an inline access error instead of redirecting to login", () => {
    const markup = renderToStaticMarkup(
      <SharedNoteView state={{ kind: "error", message: "공유 링크가 만료되었습니다." }} />
    );

    expect(markup).toContain("role=\"alert\"");
    expect(markup).toContain("공유 노트를 열 수 없습니다");
    expect(markup).toContain("공유 링크가 만료되었습니다.");
  });

  it("renders shared notes as read-only content", () => {
    const note: SharedNote = {
      title: "공유된 노트",
      content: "첫 줄\n둘째 줄",
      updated_at: "2026-04-22T12:00:00.000Z",
      shared: true,
    };

    const markup = renderToStaticMarkup(<SharedNoteView state={{ kind: "ready", note }} />);

    expect(markup).toContain("읽기 전용 공유 노트");
    expect(markup).toContain("공유된 노트");
    expect(markup).toContain("첫 줄");
    expect(markup).toContain("이 화면에서는 노트를 수정할 수 없습니다.");
  });
});
