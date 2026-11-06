export const AUTO_FOCUS_ENABLED_STORAGE_KEY = "note-editor:auto-focus-enabled";
export const AUTO_FOCUS_DELAY_MS = 1000;
export const AUTO_FOCUS_INPUT_GAP_MS = 600;
export const AUTO_FOCUS_MIN_INPUTS = 3;
/** 자동 집중 중 이 시간 안에 이 거리 이상 마우스를 움직이면 해제한다. */
export const AUTO_FOCUS_EXIT_DISTANCE_PX = 40;
export const AUTO_FOCUS_EXIT_WINDOW_MS = 500;

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

export type PointerMovementState = {
  lastX: number;
  lastY: number;
  windowStartedAt: number;
  distance: number;
};

/**
 * 마우스 이동을 누적해 자동 집중을 풀지 판단한다.
 * 첫 이동은 기준점으로만 쓰고, 좌표가 그대로인 이동(레이아웃 변화로 생기는 가짜 이벤트)은 거리 0으로 본다.
 */
export function recordPointerMovement(
  current: PointerMovementState | null,
  point: { x: number; y: number; now: number }
): { state: PointerMovementState; shouldExit: boolean } {
  if (!current) {
    return {
      state: { lastX: point.x, lastY: point.y, windowStartedAt: point.now, distance: 0 },
      shouldExit: false,
    };
  }

  const step = Math.hypot(point.x - current.lastX, point.y - current.lastY);
  const windowExpired = point.now - current.windowStartedAt > AUTO_FOCUS_EXIT_WINDOW_MS;
  const state = windowExpired
    ? { lastX: point.x, lastY: point.y, windowStartedAt: point.now, distance: step }
    : { lastX: point.x, lastY: point.y, windowStartedAt: current.windowStartedAt, distance: current.distance + step };

  return { state, shouldExit: state.distance >= AUTO_FOCUS_EXIT_DISTANCE_PX };
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

