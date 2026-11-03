import { useSyncExternalStore } from "react";
import {
  filterToastsForZenMode,
  toastStore as defaultToastStore,
  type Toast,
  type ToastStore,
} from "../lib/toastStore";

type Props = {
  store?: ToastStore;
  zenMode?: boolean;
  isMobile?: boolean;
  /** 테스트/SSR 렌더링용 초기 목록. 지정하면 store 구독 대신 이 값을 사용한다. */
  toasts?: Toast[];
};

export function ToastViewport({
  store = defaultToastStore,
  zenMode = false,
  isMobile = false,
  toasts: toastsOverride,
}: Props) {
  const storeToasts = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const visibleToasts = filterToastsForZenMode(toastsOverride ?? storeToasts, zenMode);

  return (
    <div
      className={`toast-viewport${isMobile ? " toast-viewport--mobile" : ""}`}
      aria-label="알림"
      role="region"
    >
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live={toast.tone === "error" ? "assertive" : "polite"}
        >
          <span className="toast__icon" aria-hidden="true">
            {toast.tone === "error" ? "!" : toast.tone === "success" ? "✓" : "i"}
          </span>
          <span className="toast__message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => store.runAction(toast.id)}
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast__close"
            onClick={() => store.dismiss(toast.id)}
            aria-label="알림 닫기"
            title="닫기"
          >
            <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
