type HighlightSegment = {
  text: string;
  highlighted: boolean;
};

type SearchPreview = {
  text: string;
  matchStart: number;
  matchEnd: number;
  hasLeadingEllipsis: boolean;
  hasTrailingEllipsis: boolean;
};

type SearchPreviewMatch = SearchPreview & {
  index: number;
};

const DEFAULT_PREVIEW_RADIUS = 24;

type NormalizedPreview = {
  text: string;
  boundaryMap: number[];
};

export function findMatchRange(text: string, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  const matchStart = text.toLocaleLowerCase().indexOf(normalizedQuery);
  if (matchStart < 0) {
    return null;
  }

  return {
    start: matchStart,
    end: matchStart + normalizedQuery.length,
  };
}

function findMatchRanges(text: string, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const haystack = text.toLocaleLowerCase();
  const matches: Array<{ start: number; end: number }> = [];
  let fromIndex = 0;

  while (fromIndex < haystack.length) {
    const matchIndex = haystack.indexOf(normalizedQuery, fromIndex);
    if (matchIndex < 0) {
      break;
    }
    matches.push({
      start: matchIndex,
      end: matchIndex + normalizedQuery.length,
    });
    fromIndex = matchIndex + normalizedQuery.length;
  }

  return matches;
}

export function countMatchRanges(text: string, query: string) {
  return findMatchRanges(text, query).length;
}

export function splitHighlightSegments(text: string, query: string): HighlightSegment[] {
  const match = findMatchRange(text, query);
  if (!match) {
    return [{ text, highlighted: false }];
  }

  const segments: HighlightSegment[] = [];
  if (match.start > 0) {
    segments.push({ text: text.slice(0, match.start), highlighted: false });
  }
  segments.push({ text: text.slice(match.start, match.end), highlighted: true });
  if (match.end < text.length) {
    segments.push({ text: text.slice(match.end), highlighted: false });
  }
  return segments;
}

export function buildSearchPreview(
  text: string,
  query: string,
  radius = DEFAULT_PREVIEW_RADIUS
): SearchPreview | null {
  const match = findMatchRange(text, query);
  if (!match) {
    return null;
  }

  return buildSearchPreviewForMatch(text, match, radius);
}

export function buildSearchPreviews(
  text: string,
  query: string,
  radius = DEFAULT_PREVIEW_RADIUS
): SearchPreviewMatch[] {
  return findMatchRanges(text, query).flatMap((match, index) => {
    const preview = buildSearchPreviewForMatch(text, match, radius);
    return preview ? [{ ...preview, index: index + 1 }] : [];
  });
}

function buildSearchPreviewForMatch(
  text: string,
  match: { start: number; end: number },
  radius: number
) {
  const previewStart = Math.max(0, match.start - radius);
  const previewEnd = Math.min(text.length, match.end + radius);
  let effectiveStart = previewStart;
  let effectiveEnd = previewEnd;

  if (effectiveStart > 0 && !/\s/.test(text.charAt(effectiveStart - 1))) {
    const nextWhitespace = text.slice(effectiveStart, effectiveEnd).search(/\s/);
    if (nextWhitespace >= 0) {
      effectiveStart += nextWhitespace + 1;
    }
  }

  if (effectiveEnd < text.length && !/\s/.test(text.charAt(effectiveEnd))) {
    const segment = text.slice(effectiveStart, effectiveEnd);
    const lastWhitespace = Math.max(segment.lastIndexOf(" "), segment.lastIndexOf("\n"), segment.lastIndexOf("\t"));
    if (lastWhitespace > 0) {
      effectiveEnd = effectiveStart + lastWhitespace;
    }
  }

  const rawPreview = text.slice(effectiveStart, effectiveEnd);
  const normalizedPreview = normalizePreview(rawPreview);
  const previewText = normalizedPreview.text;
  if (!previewText) {
    return null;
  }

  const rawMatchStart = Math.max(0, match.start - effectiveStart);
  const rawMatchEnd = Math.min(rawPreview.length, match.end - effectiveStart);
  const effectiveMatchStart = normalizedPreview.boundaryMap[rawMatchStart] ?? 0;
  const effectiveMatchEnd = normalizedPreview.boundaryMap[rawMatchEnd] ?? effectiveMatchStart;

  return {
    text: previewText,
    matchStart: effectiveMatchStart,
    matchEnd: effectiveMatchEnd,
    hasLeadingEllipsis: effectiveStart + normalizedPreview.rawStart > 0,
    hasTrailingEllipsis: effectiveStart + normalizedPreview.rawEnd < text.length,
  };
}

function normalizePreview(rawText: string): NormalizedPreview & {
  rawStart: number;
  rawEnd: number;
} {
  const rawStart = rawText.search(/\S/);
  if (rawStart < 0) {
    return {
      text: "",
      boundaryMap: Array.from({ length: rawText.length + 1 }, () => 0),
      rawStart: 0,
      rawEnd: rawText.length,
    };
  }

  let rawEnd = rawText.length;
  while (rawEnd > rawStart && /\s/.test(rawText.charAt(rawEnd - 1))) {
    rawEnd -= 1;
  }

  const boundaryMap = Array.from({ length: rawText.length + 1 }, () => 0);
  let text = "";
  let outputIndex = 0;
  let inWhitespace = false;

  for (let index = rawStart; index < rawEnd; index += 1) {
    boundaryMap[index] = outputIndex;
    const char = rawText.charAt(index);
    if (/\s/.test(char)) {
      if (!inWhitespace) {
        text += " ";
        outputIndex += 1;
        inWhitespace = true;
      }
    } else {
      text += char;
      outputIndex += char.length;
      inWhitespace = false;
    }
    boundaryMap[index + 1] = outputIndex;
  }

  for (let index = 0; index <= rawStart; index += 1) {
    boundaryMap[index] = 0;
  }
  for (let index = rawEnd; index <= rawText.length; index += 1) {
    boundaryMap[index] = outputIndex;
  }

  return {
    text,
    boundaryMap,
    rawStart,
    rawEnd,
  };
}
