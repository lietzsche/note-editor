import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CharacterCountIndicator } from "../src/components/CharacterCountIndicator";
import { CopyAllButton } from "../src/components/CopyAllButton";
import { copyText, countGraphemes } from "../src/lib/editorProductivity";

describe("TS-10 실시간 글자 수 표시", () => {
  it("공백과 줄바꿈을 포함한 grapheme cluster 기준 글자 수를 계산한다", () => {
    expect(countGraphemes("a\nb")).toBe(3);
    expect(countGraphemes("👨‍👩‍👧‍👦")).toBe(1);
    expect(countGraphemes("한글 A")).toBe(4);
  });

  it("count-stale 상태를 짧은 과도 상태로 표시한다", () => {
    const staleMarkup = renderToStaticMarkup(
      <CharacterCountIndicator count={7} state="count-stale" />
    );
    const readyMarkup = renderToStaticMarkup(
      <CharacterCountIndicator count={7} state="count-ready" />
    );

    expect(staleMarkup).toContain("7자 · 갱신 중");
    expect(readyMarkup).toContain("7자");
  });
});

describe("TS-11 노트 전체 복사", () => {
  it("빈 본문도 복사 성공으로 처리한다", async () => {
    const clipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    const result = await copyText(clipboard, "");

    expect(result).toBe("success");
    expect(clipboard.writeText).toHaveBeenCalledWith("");
  });

  it("클립보드 실패 시 error를 반환한다", async () => {
    const clipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("denied")),
    };

    const result = await copyText(clipboard, "본문");

    expect(result).toBe("error");
  });

  it("버튼 상태에 따라 복사 피드백 문구가 바뀐다", () => {
    const successMarkup = renderToStaticMarkup(
      <CopyAllButton onCopy={() => {}} state="copy-success" />
    );
    const errorMarkup = renderToStaticMarkup(
      <CopyAllButton onCopy={() => {}} state="copy-error" />
    );

    expect(successMarkup).toContain("복사됨!");
    expect(errorMarkup).toContain("복사 실패");
  });
});
