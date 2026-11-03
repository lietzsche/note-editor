import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ACTION_TOAST_DURATION_MS,
  DEFAULT_TOAST_DURATION_MS,
  MAX_VISIBLE_TOASTS,
  createToastStore,
  filterToastsForZenMode,
  getErrorMessage,
  type Toast,
} from "../src/lib/toastStore";
import { ToastViewport } from "../src/components/ToastViewport";
import { getTrashToastMessage } from "../src/pages/useNoteActions";

function createManualTimers() {
  const callbacks = new Map<number, { callback: () => void; ms: number }>();
  let nextHandle = 1;
  return {
    schedule: (callback: () => void, ms: number) => {
      const handle = nextHandle++;
      callbacks.set(handle, { callback, ms });
      return handle;
    },
    cancel: (handle: unknown) => {
      callbacks.delete(handle as number);
    },
    flush() {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach(({ callback }) => callback());
    },
    durations: () => [...callbacks.values()].map(({ ms }) => ms),
    size: () => callbacks.size,
  };
}

describe("toast store", () => {
  it("adds toasts with default tone and duration, and auto-dismisses them", () => {
    const timers = createManualTimers();
    const store = createToastStore(timers);
    const listener = vi.fn();
    store.subscribe(listener);

    store.show({ message: "저장했습니다." });
    expect(store.getSnapshot()).toMatchObject([{ message: "저장했습니다.", tone: "info" }]);
    expect(timers.durations()).toEqual([DEFAULT_TOAST_DURATION_MS]);
    expect(listener).toHaveBeenCalledTimes(1);

    timers.flush();
    expect(store.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("gives action toasts a longer duration and runs the action once", () => {
    const timers = createManualTimers();
    const store = createToastStore(timers);
    const onAction = vi.fn();

    const id = store.show({ message: "휴지통으로 이동했습니다.", action: { label: "되돌리기", onAction } });
    expect(timers.durations()).toEqual([ACTION_TOAST_DURATION_MS]);

    store.runAction(id);
    store.runAction(id);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual([]);
    expect(timers.size()).toBe(0);
  });

  it("keeps only the most recent toasts", () => {
    const timers = createManualTimers();
    const store = createToastStore(timers);
    for (let index = 0; index < MAX_VISIBLE_TOASTS + 2; index += 1) {
      store.show({ message: `알림 ${index}` });
    }
    const messages = store.getSnapshot().map((toast) => toast.message);
    expect(messages).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(messages.at(-1)).toBe(`알림 ${MAX_VISIBLE_TOASTS + 1}`);
    expect(timers.size()).toBe(MAX_VISIBLE_TOASTS);
  });

  it("dismisses and clears toasts while cancelling their timers", () => {
    const timers = createManualTimers();
    const store = createToastStore(timers);
    const first = store.show({ message: "a" });
    store.show({ message: "b" });

    store.dismiss(first);
    expect(store.getSnapshot().map((toast) => toast.message)).toEqual(["b"]);
    store.clear();
    expect(store.getSnapshot()).toEqual([]);
    expect(timers.size()).toBe(0);
  });

  it("only shows errors and action toasts in zen mode", () => {
    const toasts: Toast[] = [
      { id: 1, message: "복사했습니다.", tone: "success", durationMs: 4000 },
      { id: 2, message: "실패", tone: "error", durationMs: 4000 },
      { id: 3, message: "삭제", tone: "info", durationMs: 5000, action: { label: "되돌리기", onAction: () => {} } },
    ];
    expect(filterToastsForZenMode(toasts, false)).toHaveLength(3);
    expect(filterToastsForZenMode(toasts, true).map((toast) => toast.id)).toEqual([2, 3]);
  });

  it("extracts error messages with a fallback", () => {
    expect(getErrorMessage(new Error("서버 오류"), "기본")).toBe("서버 오류");
    expect(getErrorMessage("unknown", "기본")).toBe("기본");
    expect(getErrorMessage(new Error(""), "기본")).toBe("기본");
  });
});

describe("toast viewport", () => {
  it("renders an accessible region with role per tone and the action button", () => {
    const markup = renderToStaticMarkup(
      <ToastViewport
        toasts={[
          { id: 1, message: "노트를 휴지통으로 이동했습니다.", tone: "info", durationMs: 5000, action: { label: "되돌리기", onAction: () => {} } },
          { id: 2, message: "그룹을 만들지 못했습니다.", tone: "error", durationMs: 4000 },
        ]}
      />
    );

    expect(markup).toContain("role=\"region\"");
    expect(markup).toContain("role=\"status\"");
    expect(markup).toContain("role=\"alert\"");
    expect(markup).toContain("되돌리기");
    expect(markup).toContain("알림 닫기");
  });
});

describe("trash toast message", () => {
  it("includes a shortened note title", () => {
    expect(getTrashToastMessage("회의록")).toBe("'회의록' 노트를 휴지통으로 이동했습니다.");
    expect(getTrashToastMessage("  ")).toBe("노트를 휴지통으로 이동했습니다.");
    expect(getTrashToastMessage("가".repeat(30))).toBe(`'${"가".repeat(20)}…' 노트를 휴지통으로 이동했습니다.`);
  });
});
