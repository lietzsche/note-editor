export const AUTO_FOCUS_ENABLED_STORAGE_KEY = "note-editor:auto-focus-enabled";
export const AUTO_FOCUS_DELAY_MS = 1000;
export const AUTO_FOCUS_INPUT_GAP_MS = 600;
export const AUTO_FOCUS_MIN_INPUTS = 3;

export type FocusMode = "off" | "manual" | "auto";

export type AutoFocusInputBurst = {
  startedAt: number;
  lastInputAt: number;
  inputCount: number;
};

export function recordAutoFocusInput(
  current: AutoFocusInputBurst | null,
  now: number
): { burst: AutoFocusInputBurst; delayMs: number | null } {
  const continuesBurst = current && now - current.lastInputAt <= AUTO_FOCUS_INPUT_GAP_MS;
  const burst = continuesBurst
    ? { ...current, lastInputAt: now, inputCount: current.inputCount + 1 }
    : { startedAt: now, lastInputAt: now, inputCount: 1 };

  if (burst.inputCount < AUTO_FOCUS_MIN_INPUTS) {
    return { burst, delayMs: null };
  }

  return {
    burst,
    delayMs: Math.max(0, AUTO_FOCUS_DELAY_MS - (now - burst.startedAt)),
  };
}

export function shouldScheduleAutoFocus({
  enabled,
  isMobile,
  hasEditableNote,
  focusMode,
}: {
  enabled: boolean;
  isMobile: boolean;
  hasEditableNote: boolean;
  focusMode: FocusMode;
}) {
  return enabled && !isMobile && hasEditableNote && focusMode === "off";
}

export function toggleManualFocusMode(mode: FocusMode): FocusMode {
  return mode === "off" ? "manual" : "off";
}

