export type ToastTone = "info" | "success" | "error";

export type ToastAction = {
  label: string;
  onAction: () => void;
};

export type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs: number;
};

export type ToastInput = {
  message: string;
  tone?: ToastTone;
  action?: ToastAction;
  durationMs?: number;
};

export const DEFAULT_TOAST_DURATION_MS = 4000;
export const ACTION_TOAST_DURATION_MS = 5000;
export const MAX_VISIBLE_TOASTS = 3;

type TimerHandle = unknown;

type ToastStoreOptions = {
  schedule?: (callback: () => void, ms: number) => TimerHandle;
  cancel?: (handle: TimerHandle) => void;
};

export type ToastStore = ReturnType<typeof createToastStore>;

export function createToastStore(options: ToastStoreOptions = {}) {
  const schedule = options.schedule ?? ((callback, ms) => setTimeout(callback, ms));
  const cancel = options.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let toasts: Toast[] = [];
  let nextId = 1;
  const timers = new Map<number, TimerHandle>();
  const listeners = new Set<() => void>();

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function clearTimer(id: number) {
    const handle = timers.get(id);
    if (handle !== undefined) {
      cancel(handle);
      timers.delete(id);
    }
  }

  function dismiss(id: number) {
    if (!toasts.some((toast) => toast.id === id)) return;
    clearTimer(id);
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
  }

  function show(input: ToastInput): number {
    const id = nextId++;
    const durationMs = input.durationMs
      ?? (input.action ? ACTION_TOAST_DURATION_MS : DEFAULT_TOAST_DURATION_MS);
    const toast: Toast = {
      id,
      message: input.message,
      tone: input.tone ?? "info",
      action: input.action,
      durationMs,
    };

    const overflow = toasts.length + 1 - MAX_VISIBLE_TOASTS;
    if (overflow > 0) {
      toasts.slice(0, overflow).forEach((dropped) => clearTimer(dropped.id));
      toasts = toasts.slice(overflow);
    }

    toasts = [...toasts, toast];
    if (durationMs > 0) {
      timers.set(id, schedule(() => dismiss(id), durationMs));
    }
    emit();
    return id;
  }

  function runAction(id: number) {
    const toast = toasts.find((item) => item.id === id);
    if (!toast?.action) return;
    dismiss(id);
    toast.action.onAction();
  }

  function clear() {
    timers.forEach((handle) => cancel(handle));
    timers.clear();
    toasts = [];
    emit();
  }

  return {
    show,
    dismiss,
    runAction,
    clear,
    getSnapshot: () => toasts,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const toastStore = createToastStore();

export function showToast(input: ToastInput) {
  return toastStore.show(input);
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** 몰입 모드에서는 흐름을 끊지 않도록 오류와 액션(되돌리기 등)이 있는 토스트만 노출한다. */
export function filterToastsForZenMode(toasts: Toast[], zenMode: boolean) {
  if (!zenMode) return toasts;
  return toasts.filter((toast) => toast.tone === "error" || Boolean(toast.action));
}
