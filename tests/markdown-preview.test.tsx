import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownPreview } from "../src/components/MarkdownPreview";

describe("MarkdownPreview", () => {
  it("renders GFM markdown elements including headings, lists, tables, and task lists", () => {
    const content = [
      "## 주간 정리",
      "",
      "**강조**와 ~~취소선~~ 그리고 `inline`",
      "",
      "- [ ] 할 일 1",
      "- [x] 할 일 2",
      "",
      "| 항목 | 상태 |",
      "| --- | --- |",
      "| 배포 | 완료 |",
    ].join("\n");

    const markup = renderToStaticMarkup(
      <MarkdownPreview content={content} interactive={false} />
    );

    expect(markup).toContain("<h2>주간 정리</h2>");
    expect(markup).toContain("<strong>강조</strong>");
    expect(markup).toContain("<del>취소선</del>");
    expect(markup).toContain("<code>inline</code>");
    expect(markup).toContain("<table>");
    expect(markup).toContain("disabled=\"\"");
  });

  it("enables checkboxes only when interactive and onToggleTask are provided", () => {
    const markup = renderToStaticMarkup(
      <MarkdownPreview
        content="- [ ] 클릭 가능"
        interactive={true}
        onToggleTask={() => {}}
      />
    );

    expect(markup).toContain("type=\"checkbox\"");
    expect(markup).not.toContain("disabled");
  });

  it("sanitizes unsafe links and opens external links safely", () => {
    const content = [
      "[안전한 링크](https://example.com)",
      "[위험한 링크](javascript:alert(1))",
    ].join("\n\n");

    const markup = renderToStaticMarkup(<MarkdownPreview content={content} />);

    expect(markup).toContain("href=\"https://example.com\"");
    expect(markup).toContain("target=\"_blank\"");
    expect(markup).toContain("rel=\"noopener noreferrer\"");
    expect(markup).not.toContain("javascript:alert");
    expect(markup).toContain("<span>위험한 링크</span>");
  });

  it("renders empty state text when content is blank", () => {
    const markup = renderToStaticMarkup(
      <MarkdownPreview content="   " emptyText="비어 있습니다." />
    );

    expect(markup).toContain("비어 있습니다.");
  });
});
