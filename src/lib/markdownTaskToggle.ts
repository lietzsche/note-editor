const TASK_LINE_REGEX = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\](?:\s|$).*)$/;
const FENCE_OPEN_REGEX = /^\s*(`{3,}|~{3,})/;

export function toggleMarkdownTaskAtIndex(markdown: string, targetIndex: number): string {
  if (targetIndex < 0 || !markdown) {
    return markdown;
  }

  const lines = markdown.split("\n");
  let activeFenceChar: string | null = null;
  let activeFenceLength = 0;
  let currentTaskIndex = 0;
  let changed = false;

  const nextLines = lines.map((line) => {
    const fenceMatch = line.match(FENCE_OPEN_REGEX);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const fenceChar = fence[0];
      if (activeFenceChar === null) {
        activeFenceChar = fenceChar;
        activeFenceLength = fence.length;
        return line;
      }
      if (activeFenceChar === fenceChar && fence.length >= activeFenceLength && line.trim() === fence) {
        activeFenceChar = null;
        activeFenceLength = 0;
        return line;
      }
    }

    if (activeFenceChar !== null) {
      return line;
    }

    const match = line.match(TASK_LINE_REGEX);
    if (!match) {
      return line;
    }

    if (currentTaskIndex === targetIndex) {
      changed = true;
      const nextMark = match[2] === " " ? "x" : " ";
      currentTaskIndex += 1;
      return `${match[1]}${nextMark}${match[3]}`;
    }

    currentTaskIndex += 1;
    return line;
  });

  return changed ? nextLines.join("\n") : markdown;
}

export function isSafeMarkdownHref(href?: string): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed, "https://example.invalid");
    return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:";
  } catch {
    return false;
  }
}
