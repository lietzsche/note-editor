import { describe, expect, it, vi } from "vitest";
import {
  BACK_GUARD_STATE_KEY,
  createBackHandlerStack,
  installBackGuard,
  isBackGuardState,
} from "../src/lib/backNavigation";
import { canLeaveNotesPage } from "../src/lib/notesPageTransitions";
import type { Note } from "../src/lib/api";

/** 브라우저 이동 기록을 흉내 낸다. back()은 popstate를 동기로 발생시킨다. */
function createFakeBrowser(initialState: unknown = { idx: 0 }) {
  const entries: unknown[] = [initialState];
  let index = 0;
  let listener: ((event: PopStateEvent) => void) | null = null;
  let exited = false;

  const history = {
    get state() {
      return entries[index];
    },
    pushState(state: unknown) {
      entries.splice(index + 1);
      entries.push(state);
      index += 1;
    },
    back() {
      if (index === 0) {
        exited = true;
        return;
      }
      index -= 1;
      listener?.({ state: entries[index] } as PopStateEvent);
    },
  };
  const win = {
    addEventListener: (_type: string, fn: EventListener) => {
      listener = fn as (event: PopStateEvent) => void;
    },
    removeEventListener: () => {
      listener = null;
    },
  };

  return {
    history,
    win,
    get length() {
      return entries.length;
    },
    get index() {
      return index;
    },
    get exited() {
      return exited;
    },
    /** 사용자가 휴대폰 뒤로가기를 누른 상황 */
    pressBack() {
      history.back();
    },
  };
}

function setup(options: { canLeave?: () => boolean; initialState?: unknown } = {}) {
  const browser = createFakeBrowser(options.initialState);
  const stack = createBackHandlerStack();
  const onLeaveBlocked = vi.fn();
  const guard = installBackGuard({
    stack,
    history: browser.history as unknown as History,
    win: browser.win as unknown as Window,
    canLeave: options.canLeave ?? (() => true),
    onLeaveBlocked,
  });
  return { browser, stack, guard, onLeaveBlocked };
}

const note: Note = {
  id: "note-1",
  title: "Draft",
  content: "content",
  group_id: "g1",
  sort_order: 0,
  updated_at: "2026-11-05T00:00:00.000Z",
};

describe("back handler stack", () => {
  it("runs only the most recently registered handler", () => {
    const stack = createBackHandlerStack();
    const panel = vi.fn();
    const menu = vi.fn();
    stack.register(panel);
    stack.register(menu);

    expect(stack.handleBack()).toBe(true);
    expect(menu).toHaveBeenCalledTimes(1);
    expect(panel).not.toHaveBeenCalled();
  });

  it("falls back to the previous handler after unregistering", () => {
    const stack = createBackHandlerStack();
    const panel = vi.fn();
    stack.register(panel);
    const unregisterMenu = stack.register(vi.fn());
    unregisterMenu();

    stack.handleBack();
    expect(panel).toHaveBeenCalledTimes(1);
    expect(stack.size()).toBe(1);
  });

  it("returns false when nothing is registered", () => {
    expect(createBackHandlerStack().handleBack()).toBe(false);
  });
});

describe("installBackGuard", () => {
  it("pushes one guard entry that keeps the router state", () => {
    const { browser } = setup();
    expect(browser.length).toBe(2);
    expect(browser.history.state).toEqual({ idx: 0, [BACK_GUARD_STATE_KEY]: true });
  });

  it("reuses an existing guard entry instead of stacking another one", () => {
    const { browser } = setup({ initialState: { idx: 0, [BACK_GUARD_STATE_KEY]: true } });
    expect(browser.length).toBe(1);
  });

  it("closes the top overlay and re-arms the guard on back", () => {
    const { browser, stack } = setup();
    const closePanel = vi.fn();
    const closeMenu = vi.fn();
    stack.register(closePanel);
    const unregisterMenu = stack.register(() => {
      closeMenu();
      unregisterMenu();
    });

    browser.pressBack();
    expect(closeMenu).toHaveBeenCalledTimes(1);
    expect(closePanel).not.toHaveBeenCalled();
    expect(isBackGuardState(browser.history.state)).toBe(true);
    expect(browser.length).toBe(2);

    browser.pressBack();
    expect(closePanel).toHaveBeenCalledTimes(1);
    expect(browser.exited).toBe(false);
  });

  it("leaves the app when nothing is open and edits are saved", () => {
    const browser = createFakeBrowser();
    browser.history.pushState({ idx: 0 }); // 앱 이전 페이지 위에 노트 화면이 있는 상황
    const stack = createBackHandlerStack();
    installBackGuard({
      stack,
      history: browser.history as unknown as History,
      win: browser.win as unknown as Window,
      canLeave: () => true,
      onLeaveBlocked: vi.fn(),
    });

    browser.pressBack();
    expect(browser.index).toBe(0);
  });

  it("stays and reports when there are unsaved edits", () => {
    const { browser, onLeaveBlocked } = setup({ canLeave: () => false });

    browser.pressBack();
    expect(onLeaveBlocked).toHaveBeenCalledTimes(1);
    expect(isBackGuardState(browser.history.state)).toBe(true);
    expect(browser.exited).toBe(false);
  });

  it("re-arms the guard when a new handler registers after the guard was used up", () => {
    const { browser, stack } = setup();
    browser.pressBack(); // 첫 기록이라 나가지 못하고 기본 항목에 남음
    expect(isBackGuardState(browser.history.state)).toBe(false);

    stack.register(vi.fn());
    expect(isBackGuardState(browser.history.state)).toBe(true);
  });

  it("stops handling back after uninstall without touching history", () => {
    const { browser, stack, guard } = setup();
    const handler = vi.fn();
    stack.register(handler);
    const lengthBefore = browser.length;
    guard.uninstall();

    browser.pressBack();
    expect(handler).not.toHaveBeenCalled();
    expect(browser.length).toBe(lengthBefore);
  });
});

describe("canLeaveNotesPage", () => {
  it("allows leaving only when the selected note is fully saved", () => {
    expect(canLeaveNotesPage(null, "dirty")).toBe(true);
    expect(canLeaveNotesPage(note, "saved")).toBe(true);
    expect(canLeaveNotesPage(note, "dirty")).toBe(false);
    expect(canLeaveNotesPage(note, "saving")).toBe(false);
    expect(canLeaveNotesPage(note, "error")).toBe(false);
    expect(canLeaveNotesPage(note, "conflict")).toBe(false);
  });
});
