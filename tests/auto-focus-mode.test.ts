import { describe, expect, it } from "vitest";
import {
  AUTO_FOCUS_EXIT_WINDOW_MS,
  recordPointerMovement,
  shouldScheduleAutoFocus,
  recordAutoFocusInput,
  toggleManualFocusMode,
} from "../src/lib/autoFocusMode";

describe("auto focus mode", () => {
  it("schedules only for an enabled desktop editable note while focus mode is off", () => {
    expect(shouldScheduleAutoFocus({
      enabled: true,
      isMobile: false,
      hasEditableNote: true,
      focusMode: "off",
    })).toBe(true);

    expect(shouldScheduleAutoFocus({
      enabled: false,
      isMobile: false,
      hasEditableNote: true,
      focusMode: "off",
    })).toBe(false);
    expect(shouldScheduleAutoFocus({
      enabled: true,
      isMobile: true,
      hasEditableNote: true,
      focusMode: "off",
    })).toBe(false);
    expect(shouldScheduleAutoFocus({
      enabled: true,
      isMobile: false,
      hasEditableNote: false,
      focusMode: "off",
    })).toBe(false);
    expect(shouldScheduleAutoFocus({
      enabled: true,
      isMobile: false,
      hasEditableNote: true,
      focusMode: "auto",
    })).toBe(false);
  });

  it("uses the manual toggle to enter from off and exit either active mode", () => {
    expect(toggleManualFocusMode("off")).toBe("manual");
    expect(toggleManualFocusMode("manual")).toBe("off");
    expect(toggleManualFocusMode("auto")).toBe("off");
  });

  it("requires a short burst of repeated input and enters one second after it starts", () => {
    const first = recordAutoFocusInput(null, 1000);
    expect(first.delayMs).toBeNull();
    const second = recordAutoFocusInput(first.burst, 1200);
    expect(second.delayMs).toBeNull();
    const third = recordAutoFocusInput(second.burst, 1400);
    expect(third.delayMs).toBe(600);

    const restarted = recordAutoFocusInput(third.burst, 2101);
    expect(restarted.burst.inputCount).toBe(1);
    expect(restarted.delayMs).toBeNull();
  });
});

describe("auto focus pointer exit", () => {
  function move(points: { x: number; y: number; now: number }[]) {
    let state = null;
    let shouldExit = false;
    for (const point of points) {
      const result = recordPointerMovement(state, point);
      state = result.state;
      shouldExit = result.shouldExit;
    }
    return shouldExit;
  }

  it("uses the first movement only as a baseline", () => {
    expect(move([{ x: 500, y: 500, now: 0 }])).toBe(false);
  });

  it("ignores small accidental movement", () => {
    expect(move([
      { x: 100, y: 100, now: 0 },
      { x: 105, y: 103, now: 50 },
      { x: 110, y: 104, now: 100 },
    ])).toBe(false);
  });

  it("exits after moving 40px or more within the window", () => {
    expect(move([
      { x: 100, y: 100, now: 0 },
      { x: 120, y: 100, now: 100 },
      { x: 145, y: 100, now: 200 },
    ])).toBe(true);
  });

  it("resets the accumulated distance after the window expires", () => {
    expect(move([
      { x: 100, y: 100, now: 0 },
      { x: 130, y: 100, now: 100 },
      { x: 140, y: 100, now: AUTO_FOCUS_EXIT_WINDOW_MS + 200 },
    ])).toBe(false);
  });

  it("ignores repeated events at the same position", () => {
    expect(move(Array.from({ length: 20 }, (_, i) => ({ x: 300, y: 300, now: i * 10 })))).toBe(false);
  });
});
