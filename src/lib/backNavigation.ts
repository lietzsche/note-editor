/**
 * 모바일 휴대폰 뒤로가기(popstate)를 앱 안의 화면 전환으로 바꾸는 로직.
 *
 * - 열린 메뉴·모달·패널이 각자 처리기를 등록하고, 뒤로가기 시 가장 최근 처리기 하나만 실행한다.
 * - 이동 기록에 가드 항목 하나를 쌓아 두고, 뒤로가기로 가드가 빠지면 다시 채운다.
 * - 처리기가 없고 나가도 되면 실제로 한 단계 더 뒤로 가서 앱을 떠난다.
 */

export const BACK_GUARD_STATE_KEY = "__noteBackGuard";

export type BackHandler = () => void;

export function createBackHandlerStack() {
  let nextId = 0;
  const entries: { id: number; handler: BackHandler }[] = [];
  const listeners = new Set<() => void>();

  return {
    register(handler: BackHandler) {
      const id = nextId++;
      entries.push({ id, handler });
      listeners.forEach((listener) => listener());
      return () => {
        const index = entries.findIndex((entry) => entry.id === id);
        if (index >= 0) entries.splice(index, 1);
      };
    },
    /** 가장 최근 처리기를 실행한다. 처리기가 없으면 false. */
    handleBack() {
      const top = entries[entries.length - 1];
      if (!top) return false;
      top.handler();
      return true;
    },
    size() {
      return entries.length;
    },
    /** 처리기가 새로 등록될 때 알림을 받는다. */
    onRegister(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type BackHandlerStack = ReturnType<typeof createBackHandlerStack>;

export const backHandlerStack = createBackHandlerStack();

type HistoryLike = Pick<History, "state" | "pushState" | "back">;
type WindowLike = Pick<Window, "addEventListener" | "removeEventListener">;

export function isBackGuardState(state: unknown) {
  return typeof state === "object"
    && state !== null
    && (state as Record<string, unknown>)[BACK_GUARD_STATE_KEY] === true;
}

type InstallBackGuardOptions = {
  stack: BackHandlerStack;
  history: HistoryLike;
  win: WindowLike;
  /** 앱을 떠나도 되는지. false면 떠나지 않고 onLeaveBlocked를 호출한다. */
  canLeave: () => boolean;
  onLeaveBlocked: () => void;
};

/**
 * 가드를 설치하고 해제 함수와 재무장 함수를 돌려준다.
 * 해제할 때는 history를 건드리지 않는다. 다른 페이지로 이동하는 중일 수 있기 때문이다.
 * 남은 가드 항목은 다시 설치될 때 재사용한다.
 */
export function installBackGuard({
  stack,
  history,
  win,
  canLeave,
  onLeaveBlocked,
}: InstallBackGuardOptions) {
  // armed: 현재 가드 항목 위에 있다는 뜻
  let armed = isBackGuardState(history.state);

  function arm() {
    if (armed) return;
    const base = typeof history.state === "object" && history.state !== null ? history.state : {};
    history.pushState({ ...base, [BACK_GUARD_STATE_KEY]: true }, "");
    armed = true;
  }

  function handlePopState(event: PopStateEvent) {
    if (isBackGuardState(event.state)) {
      // 앞으로 가기나 다른 화면에서 돌아와 가드 항목에 다시 올라선 경우
      armed = true;
      return;
    }
    if (!armed) return;
    armed = false;

    if (stack.handleBack()) {
      arm();
      return;
    }
    if (!canLeave()) {
      arm();
      onLeaveBlocked();
      return;
    }
    history.back();
  }

  win.addEventListener("popstate", handlePopState as EventListener);
  arm();
  // 앱을 떠나려다 이동 기록 맨 앞이라 남은 경우, 다음 화면 전환 때 가드를 다시 건다.
  const stopListening = stack.onRegister(arm);

  return {
    arm,
    uninstall() {
      win.removeEventListener("popstate", handlePopState as EventListener);
      stopListening();
    },
  };
}
