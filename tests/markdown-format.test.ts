import { describe, expect, it } from "vitest";
import { applyMarkdownFormat } from "../src/lib/markdownFormat";

describe("applyMarkdownFormat", () => {
  describe("bold format", () => {
    it("wraps selected text with **", () => {
      const result = applyMarkdownFormat("hello world", 0, 5, "bold");
      expect(result.text).toBe("**hello** world");
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(7);
    });

    it("inserts **** and places cursor in between when no text is selected", () => {
      const result = applyMarkdownFormat("hello ", 6, 6, "bold");
      expect(result.text).toBe("hello ****");
      expect(result.selectionStart).toBe(8);
      expect(result.selectionEnd).toBe(8);
    });

    it("unwraps when selected text already has **", () => {
      const result = applyMarkdownFormat("**hello** world", 0, 9, "bold");
      expect(result.text).toBe("hello world");
      expect(result.selectionStart).toBe(0);
      expect(result.selectionEnd).toBe(5);
    });

    it("unwraps when surrounding characters are **", () => {
      const result = applyMarkdownFormat("**hello** world", 2, 7, "bold");
      expect(result.text).toBe("hello world");
      expect(result.selectionStart).toBe(0);
      expect(result.selectionEnd).toBe(5);
    });
  });

  describe("italic and strike format", () => {
    it("wraps selected text with *", () => {
      const result = applyMarkdownFormat("hello", 0, 5, "italic");
      expect(result.text).toBe("*hello*");
      expect(result.selectionStart).toBe(1);
      expect(result.selectionEnd).toBe(6);
    });

    it("wraps selected text with ~~", () => {
      const result = applyMarkdownFormat("hello", 0, 5, "strike");
      expect(result.text).toBe("~~hello~~");
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(7);
    });
  });

  describe("code format", () => {
    it("wraps single-line text with backticks", () => {
      const result = applyMarkdownFormat("const x = 1;", 0, 12, "code");
      expect(result.text).toBe("`const x = 1;`");
      expect(result.selectionStart).toBe(1);
      expect(result.selectionEnd).toBe(13);
    });

    it("wraps multi-line text with triple backticks", () => {
      const text = "const a = 1;\nconst b = 2;";
      const result = applyMarkdownFormat(text, 0, text.length, "code");
      expect(result.text).toBe("```\nconst a = 1;\nconst b = 2;\n```");
    });
  });

  describe("heading format (h2 and h3)", () => {
    it("prefixes current line with ## for h2", () => {
      const text = "Section Title\nSome content";
      const result = applyMarkdownFormat(text, 5, 5, "h2");
      expect(result.text).toBe("## Section Title\nSome content");
    });

    it("toggles off ## if current line already has ##", () => {
      const text = "## Section Title\nSome content";
      const result = applyMarkdownFormat(text, 5, 5, "h2");
      expect(result.text).toBe("Section Title\nSome content");
    });

    it("replaces ### with ## when toggling from h3 to h2", () => {
      const text = "### Section Title";
      const result = applyMarkdownFormat(text, 5, 5, "h2");
      expect(result.text).toBe("## Section Title");
    });

    it("prefixes current line with ### for h3", () => {
      const text = "Sub Section";
      const result = applyMarkdownFormat(text, 2, 2, "h3");
      expect(result.text).toBe("### Sub Section");
    });
  });

  describe("list format (bullet and task)", () => {
    it("prefixes line with - for bullet", () => {
      const text = "Item 1\nItem 2";
      const result = applyMarkdownFormat(text, 0, 0, "bullet");
      expect(result.text).toBe("- Item 1\nItem 2");
    });

    it("prefixes multiple selected lines with -", () => {
      const text = "Item 1\nItem 2";
      const result = applyMarkdownFormat(text, 0, text.length, "bullet");
      expect(result.text).toBe("- Item 1\n- Item 2");
    });

    it("toggles off bullet when all selected lines have bullet", () => {
      const text = "- Item 1\n- Item 2";
      const result = applyMarkdownFormat(text, 0, text.length, "bullet");
      expect(result.text).toBe("Item 1\nItem 2");
    });

    it("prefixes line with - [ ] for task", () => {
      const text = "Todo item";
      const result = applyMarkdownFormat(text, 3, 3, "task");
      expect(result.text).toBe("- [ ] Todo item");
    });

    it("toggles off task when line already has - [ ]", () => {
      const text = "- [ ] Todo item";
      const result = applyMarkdownFormat(text, 3, 3, "task");
      expect(result.text).toBe("Todo item");
    });
  });
});
