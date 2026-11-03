import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getWrappedFocusIndex } from "../src/lib/useModalFocus";
import { EditorMoreMenu, getNextMenuIndex } from "../src/components/EditorMoreMenu";

describe("modal focus trap", () => {
  it("wraps forward from the last element and backward from the first", () => {
    expect(getWrappedFocusIndex({ currentIndex: 2, count: 3, shiftKey: false })).toBe(0);
    expect(getWrappedFocusIndex({ currentIndex: 0, count: 3, shiftKey: true })).toBe(2);
  });

  it("lets the browser handle focus moves inside the dialog", () => {
    expect(getWrappedFocusIndex({ currentIndex: 0, count: 3, shiftKey: false })).toBeNull();
    expect(getWrappedFocusIndex({ currentIndex: 2, count: 3, shiftKey: true })).toBeNull();
  });

  it("pulls focus back in when it is outside the dialog", () => {
    expect(getWrappedFocusIndex({ currentIndex: -1, count: 3, shiftKey: false })).toBe(0);
    expect(getWrappedFocusIndex({ currentIndex: -1, count: 3, shiftKey: true })).toBe(2);
    expect(getWrappedFocusIndex({ currentIndex: -1, count: 0, shiftKey: false })).toBeNull();
  });
});

describe("editor more menu", () => {
  it("moves through menu items with arrow, Home and End keys", () => {
    expect(getNextMenuIndex(-1, 3, "ArrowDown")).toBe(0);
    expect(getNextMenuIndex(2, 3, "ArrowDown")).toBe(0);
    expect(getNextMenuIndex(0, 3, "ArrowUp")).toBe(2);
    expect(getNextMenuIndex(1, 3, "Home")).toBe(0);
    expect(getNextMenuIndex(0, 3, "End")).toBe(2);
    expect(getNextMenuIndex(0, 3, "Enter")).toBeNull();
    expect(getNextMenuIndex(0, 0, "ArrowDown")).toBeNull();
  });

  it("renders a collapsed menu trigger", () => {
    const markup = renderToStaticMarkup(
      <EditorMoreMenu onCopy={() => {}} onDelete={() => {}} />
    );
    expect(markup).toContain("aria-haspopup=\"menu\"");
    expect(markup).toContain("aria-expanded=\"false\"");
    expect(markup).toContain("더보기");
    expect(markup).not.toContain("role=\"menu\"");
  });
});
