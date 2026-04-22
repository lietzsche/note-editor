export type GraphemeSegmenter = {
  segment(input: string): Iterable<unknown>;
};

export type ClipboardLike = {
  writeText(text: string): Promise<void>;
};

const DEFAULT_SPELL_CHECK_CHUNK_SIZE = 400;

function createDefaultSegmenter(): GraphemeSegmenter | null {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) {
    return null;
  }

  return new Intl.Segmenter(undefined, { granularity: "grapheme" });
}

const defaultSegmenter = createDefaultSegmenter();

export function countGraphemes(
  text: string,
  segmenter: GraphemeSegmenter | null = defaultSegmenter
) {
  if (!segmenter) {
    return Array.from(text).length;
  }

  return Array.from(segmenter.segment(text)).length;
}

export async function copyText(
  clipboard: ClipboardLike | null | undefined,
  text: string
): Promise<"success" | "error"> {
  if (!clipboard) {
    return "error";
  }

  try {
    await clipboard.writeText(text);
    return "success";
  } catch {
    return "error";
  }
}

export function splitTextForSpellCheck(
  text: string,
  maxChunkSize = DEFAULT_SPELL_CHECK_CHUNK_SIZE
) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [""];

  const safeChunkSize = Math.max(50, Math.floor(maxChunkSize));
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  const flushCurrentChunk = () => {
    if (!currentChunk) return;
    chunks.push(currentChunk);
    currentChunk = "";
  };

  const pushPiece = (piece: string, separator: string) => {
    if (!piece) return;

    const nextChunk = currentChunk ? `${currentChunk}${separator}${piece}` : piece;
    if (countGraphemes(nextChunk) <= safeChunkSize) {
      currentChunk = nextChunk;
      return;
    }

    flushCurrentChunk();

    if (countGraphemes(piece) <= safeChunkSize) {
      currentChunk = piece;
      return;
    }

    for (const slicedPiece of splitOversizedPiece(piece, safeChunkSize)) {
      chunks.push(slicedPiece);
    }
  };

  for (const paragraph of paragraphs) {
    const sentenceLikeParts = splitParagraphForSpellCheck(paragraph);
    for (const part of sentenceLikeParts) {
      pushPiece(part, currentChunk ? " " : "");
    }
    flushCurrentChunk();
  }

  if (chunks.length === 0) {
    return [normalized];
  }

  return chunks;
}

function splitParagraphForSpellCheck(paragraph: string) {
  const lines = paragraph
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parts: string[] = [];

  for (const line of lines) {
    const sentences = line
      .split(/(?<=[.!?])\s+|(?<=다\.)\s+|(?<=요\.)\s+|(?<=죠\.)\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (sentences.length > 0) {
      parts.push(...sentences);
      continue;
    }

    parts.push(line);
  }

  return parts;
}

function splitOversizedPiece(piece: string, maxChunkSize: number) {
  const words = piece.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    const nextChunk = currentChunk ? `${currentChunk} ${word}` : word;
    if (countGraphemes(nextChunk) <= maxChunkSize) {
      currentChunk = nextChunk;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    if (countGraphemes(word) <= maxChunkSize) {
      currentChunk = word;
      continue;
    }

    chunks.push(...splitByGraphemeLength(word, maxChunkSize));
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function splitByGraphemeLength(text: string, maxChunkSize: number) {
  const graphemes = Array.from(text);
  const chunks: string[] = [];

  for (let index = 0; index < graphemes.length; index += maxChunkSize) {
    chunks.push(graphemes.slice(index, index + maxChunkSize).join(""));
  }

  return chunks;
}
