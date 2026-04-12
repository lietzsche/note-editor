export type GraphemeSegmenter = {
  segment(input: string): Iterable<unknown>;
};

export type ClipboardLike = {
  writeText(text: string): Promise<void>;
};

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
