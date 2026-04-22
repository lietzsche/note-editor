import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterCountIndicator } from "../src/components/CharacterCountIndicator";
import { CopyAllButton } from "../src/components/CopyAllButton";
import {
  copyText,
  countGraphemes,
  splitTextForSpellCheck,
} from "../src/lib/editorProductivity";

describe("TS-10 character count", () => {
  it("counts grapheme clusters including whitespace and line breaks", () => {
    expect(countGraphemes("a\nb")).toBe(3);
    expect(countGraphemes("👨‍👩‍👧‍👦")).toBe(1);
    expect(countGraphemes("한글 A")).toBe(4);
  });

  it("renders a short stale state before settling", () => {
    const staleMarkup = renderToStaticMarkup(
      <CharacterCountIndicator count={7} state="count-stale" />
    );
    const readyMarkup = renderToStaticMarkup(
      <CharacterCountIndicator count={7} state="count-ready" />
    );

    expect(staleMarkup).toContain("7");
    expect(readyMarkup).toContain("7");
  });
});

describe("TS-11 copy all", () => {
  it("treats empty content as a successful copy", async () => {
    const clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    const result = await copyText(clipboard, "");

    expect(result).toBe("success");
    expect(clipboard.writeText).toHaveBeenCalledWith("");
  });

  it("returns error when the clipboard write fails", async () => {
    const clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("denied")),
    };

    const result = await copyText(clipboard, "본문");

    expect(result).toBe("error");
  });

  it("changes the button feedback label by state", () => {
    const successMarkup = renderToStaticMarkup(
      <CopyAllButton onCopy={() => {}} state="copy-success" />
    );
    const errorMarkup = renderToStaticMarkup(
      <CopyAllButton onCopy={() => {}} state="copy-error" />
    );

    expect(successMarkup).toContain("복사");
    expect(errorMarkup).toContain("복사");
  });
});

describe("FEATURE-010 spell check chunking", () => {
  it("keeps short content in a single chunk", () => {
    expect(splitTextForSpellCheck("짧은 문장")).toEqual(["짧은 문장"]);
  });

  it("splits long content into multiple chunks within the requested size", () => {
    const chunks = splitTextForSpellCheck("문장 ".repeat(220), 120);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => countGraphemes(chunk) <= 120)).toBe(true);
  });

  it("falls back to grapheme slicing for a long token without spaces", () => {
    const chunks = splitTextForSpellCheck("가".repeat(260), 100);

    expect(chunks).toHaveLength(3);
    expect(countGraphemes(chunks[0])).toBe(100);
    expect(countGraphemes(chunks[1])).toBe(100);
    expect(countGraphemes(chunks[2])).toBe(60);
  });
});
