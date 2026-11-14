import { describe, expect, it } from "vitest";
import {
  isSafeMarkdownHref,
  toggleMarkdownTaskAtIndex,
} from "../src/lib/markdownTaskToggle";

describe("toggleMarkdownTaskAtIndex", () => {
  it("toggles unchecked and checked tasks at the target index", () => {
    const source = [
      "- [ ] 첫 번째 할 일",
      "- [x] 두 번째 할 일",
      "- [ ] 세 번째 할 일",
    ].join("\n");

    expect(toggleMarkdownTaskAtIndex(source, 0)).toBe(
      ["- [x] 첫 번째 할 일", "- [x] 두 번째 할 일", "- [ ] 세 번째 할 일"].join("\n")
    );
    expect(toggleMarkdownTaskAtIndex(source, 1)).toBe(
      ["- [ ] 첫 번째 할 일", "- [ ] 두 번째 할 일", "- [ ] 세 번째 할 일"].join("\n")
    );
  });

  it("ignores task-like lines inside fenced code blocks", () => {
    const source = [
      "```md",
      "- [ ] 코드 블록 내부 항목",
      "```",
      "- [ ] 실제 할 일",
    ].join("\n");

    expect(toggleMarkdownTaskAtIndex(source, 0)).toBe(
      [
        "```md",
        "- [ ] 코드 블록 내부 항목",
        "```",
        "- [x] 실제 할 일",
      ].join("\n")
    );
  });

  it("supports ordered lists, asterisk bullets, and uppercase X", () => {
    const source = [
      "1. [ ] 번호 목록",
      "  * [X] 중첩 별표 항목",
    ].join("\n");

    expect(toggleMarkdownTaskAtIndex(source, 1)).toBe(
      ["1. [ ] 번호 목록", "  * [ ] 중첩 별표 항목"].join("\n")
    );
  });

  it("returns original markdown when index is out of range", () => {
    const source = "- [ ] 하나만 있음";
    expect(toggleMarkdownTaskAtIndex(source, -1)).toBe(source);
    expect(toggleMarkdownTaskAtIndex(source, 2)).toBe(source);
    expect(toggleMarkdownTaskAtIndex("", 0)).toBe("");
  });
});

describe("isSafeMarkdownHref", () => {
  it("allows http, https, mailto, relative paths, and hash links", () => {
    expect(isSafeMarkdownHref("https://note.lietzsche.org")).toBe(true);
    expect(isSafeMarkdownHref("http://localhost:8788")).toBe(true);
    expect(isSafeMarkdownHref("mailto:test@example.com")).toBe(true);
    expect(isSafeMarkdownHref("#section-1")).toBe(true);
    expect(isSafeMarkdownHref("/guide")).toBe(true);
  });

  it("blocks dangerous schemes and empty values", () => {
    expect(isSafeMarkdownHref("javascript:alert(1)")).toBe(false);
    expect(isSafeMarkdownHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeMarkdownHref("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeMarkdownHref("")).toBe(false);
    expect(isSafeMarkdownHref(undefined)).toBe(false);
  });
});
