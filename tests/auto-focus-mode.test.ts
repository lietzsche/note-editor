import { describe, expect, it } from "vitest";
import {
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
