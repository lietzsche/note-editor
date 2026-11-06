import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorMarkdownToolbar } from "../src/components/EditorMarkdownToolbar";

describe("EditorMarkdownToolbar", () => {
  it("renders all markdown format buttons with labels", () => {
    const markup = renderToStaticMarkup(
      <EditorMarkdownToolbar onApplyFormat={() => {}} />
    );

    expect(markup).toContain('role="toolbar"');
    expect(markup).toContain('aria-label="제목 2"');
    expect(markup).toContain('aria-label="제목 3"');
    expect(markup).toContain('aria-label="굵게"');
    expect(markup).toContain('aria-label="기울임"');
    expect(markup).toContain('aria-label="취소선"');
    expect(markup).toContain('aria-label="불릿 목록"');
    expect(markup).toContain('aria-label="체크박스"');
    expect(markup).toContain('aria-label="코드"');
  });

  it("sets disabled attribute when disabled prop is true", () => {
    const markup = renderToStaticMarkup(
      <EditorMarkdownToolbar onApplyFormat={() => {}} disabled={true} />
    );

    expect(markup).toContain("disabled");
  });
});
