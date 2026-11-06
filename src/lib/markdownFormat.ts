export type MarkdownFormatType =
  | "h2"
  | "h3"
  | "bold"
  | "italic"
  | "strike"
  | "task"
  | "bullet"
  | "code";

export interface MarkdownFormatResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

interface WrapSyntax {
  prefix: string;
  suffix: string;
}

const INLINE_SYNTAX: Record<"bold" | "italic" | "strike", WrapSyntax> = {
  bold: { prefix: "**", suffix: "**" },
  italic: { prefix: "*", suffix: "*" },
  strike: { prefix: "~~", suffix: "~~" },
};

function getLineRange(text: string, start: number, end: number): {
  lineStart: number;
  lineEnd: number;
  lines: string[];
} {
  const lineStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextNewline = text.indexOf("\n", end);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;
  const lines = text.slice(lineStart, lineEnd).split("\n");

  return { lineStart, lineEnd, lines };
}

function applyInlineFormat(
  text: string,
  start: number,
  end: number,
  syntax: WrapSyntax
): MarkdownFormatResult {
  const { prefix, suffix } = syntax;
  const pLen = prefix.length;
  const sLen = suffix.length;

  if (start !== end) {
    const selected = text.slice(start, end);
    // Check if selection itself is wrapped
    if (
      selected.startsWith(prefix) &&
      selected.endsWith(suffix) &&
      selected.length >= pLen + sLen
    ) {
      // Unwrap selection
      const unwrapped = selected.slice(pLen, -sLen);
      const newText = text.slice(0, start) + unwrapped + text.slice(end);
      return {
        text: newText,
        selectionStart: start,
        selectionEnd: start + unwrapped.length,
      };
    }

    // Check if surrounding text outside selection is wrapped
    if (
      start >= pLen &&
      text.slice(start - pLen, start) === prefix &&
      text.slice(end, end + sLen) === suffix
    ) {
      // Unwrap surrounding
      const newText = text.slice(0, start - pLen) + selected + text.slice(end + sLen);
      return {
        text: newText,
        selectionStart: start - pLen,
        selectionEnd: end - pLen,
      };
    }

    // Wrap selection
    const newText = text.slice(0, start) + prefix + selected + suffix + text.slice(end);
    return {
      text: newText,
      selectionStart: start + pLen,
      selectionEnd: end + pLen,
    };
  }

  // No selection: insert syntax markers and place cursor in between
  const newText = text.slice(0, start) + prefix + suffix + text.slice(end);
  return {
    text: newText,
    selectionStart: start + pLen,
    selectionEnd: start + pLen,
  };
}

function applyCodeFormat(
  text: string,
  start: number,
  end: number
): MarkdownFormatResult {
  const selected = text.slice(start, end);
  const isMultiLine = selected.includes("\n");

  if (isMultiLine) {
    const prefix = "```\n";
    const suffix = "\n```";
    if (selected.startsWith(prefix) && selected.endsWith(suffix) && selected.length >= prefix.length + suffix.length) {
      const unwrapped = selected.slice(prefix.length, -suffix.length);
      const newText = text.slice(0, start) + unwrapped + text.slice(end);
      return {
        text: newText,
        selectionStart: start,
        selectionEnd: start + unwrapped.length,
      };
    }

    const newText = text.slice(0, start) + prefix + selected + suffix + text.slice(end);
    return {
      text: newText,
      selectionStart: start + prefix.length,
      selectionEnd: end + prefix.length,
    };
  }

  return applyInlineFormat(text, start, end, { prefix: "`", suffix: "`" });
}

function applyHeadingFormat(
  text: string,
  start: number,
  end: number,
  level: "h2" | "h3"
): MarkdownFormatResult {
  const targetPrefix = level === "h2" ? "## " : "### ";
  const { lineStart, lineEnd, lines } = getLineRange(text, start, end);

  const updatedLines = lines.map((line) => {
    // Check if line currently starts with any heading (# )
    const headingMatch = line.match(/^#{1,6}\s+/);
    if (headingMatch) {
      if (headingMatch[0] === targetPrefix) {
        // Toggle off
        return line.slice(headingMatch[0].length);
      }
      // Replace existing heading with target prefix
      return targetPrefix + line.slice(headingMatch[0].length);
    }
    return targetPrefix + line;
  });

  const replacement = updatedLines.join("\n");
  const newText = text.slice(0, lineStart) + replacement + text.slice(lineEnd);
  const lengthDiff = replacement.length - (lineEnd - lineStart);

  return {
    text: newText,
    selectionStart: Math.max(lineStart, start + lengthDiff),
    selectionEnd: Math.max(lineStart, end + lengthDiff),
  };
}

function applyListFormat(
  text: string,
  start: number,
  end: number,
  type: "task" | "bullet"
): MarkdownFormatResult {
  const prefix = type === "task" ? "- [ ] " : "- ";
  const regex = type === "task" ? /^- \[[ xX]\]\s+/ : /^-\s+/;

  const { lineStart, lineEnd, lines } = getLineRange(text, start, end);
  const allHavePrefix = lines.length > 0 && lines.every((line) => regex.test(line));

  const updatedLines = lines.map((line) => {
    if (allHavePrefix) {
      // Toggle off
      return line.replace(regex, "");
    }
    if (regex.test(line)) {
      return line;
    }
    // If switching between bullet and task, or adding
    const otherRegex = type === "task" ? /^-\s+/ : /^- \[[ xX]\]\s+/;
    if (otherRegex.test(line)) {
      return line.replace(otherRegex, prefix);
    }
    return prefix + line;
  });

  const replacement = updatedLines.join("\n");
  const newText = text.slice(0, lineStart) + replacement + text.slice(lineEnd);
  const lengthDiff = replacement.length - (lineEnd - lineStart);

  return {
    text: newText,
    selectionStart: Math.max(lineStart, start + (lengthDiff > 0 ? prefix.length : 0)),
    selectionEnd: Math.max(lineStart, end + lengthDiff),
  };
}

export function applyMarkdownFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  formatType: MarkdownFormatType
): MarkdownFormatResult {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  switch (formatType) {
    case "bold":
    case "italic":
    case "strike":
      return applyInlineFormat(text, start, end, INLINE_SYNTAX[formatType]);
    case "code":
      return applyCodeFormat(text, start, end);
    case "h2":
    case "h3":
      return applyHeadingFormat(text, start, end, formatType);
    case "task":
    case "bullet":
      return applyListFormat(text, start, end, formatType);
    default:
      return { text, selectionStart, selectionEnd };
  }
}
