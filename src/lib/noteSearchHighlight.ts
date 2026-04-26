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

const DEFAULT_PREVIEW_RADIUS = 24;

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

export function countMatchRanges(text: string, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return 0;
  }

  const haystack = text.toLocaleLowerCase();
  let count = 0;
  let fromIndex = 0;

  while (fromIndex < haystack.length) {
    const matchIndex = haystack.indexOf(normalizedQuery, fromIndex);
    if (matchIndex < 0) {
      break;
    }
    count += 1;
    fromIndex = matchIndex + normalizedQuery.length;
  }

  return count;
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
  const previewText = rawPreview.replace(/\s+/g, " ").trim();
  if (!previewText) {
    return null;
  }

  const trimmedOffset = rawPreview.indexOf(previewText);
  const normalizedStart = effectiveStart + Math.max(trimmedOffset, 0);
  const effectiveMatchStart = Math.max(0, match.start - normalizedStart);
  const effectiveMatchEnd = Math.min(previewText.length, effectiveMatchStart + (match.end - match.start));

  return {
    text: previewText,
    matchStart: effectiveMatchStart,
    matchEnd: effectiveMatchEnd,
    hasLeadingEllipsis: normalizedStart > 0,
    hasTrailingEllipsis: normalizedStart + previewText.length < text.length,
  };
}
