import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

/**
 * Tab 키 이동 시 다이얼로그 경계에서 포커스를 순환시킬 대상 인덱스를 계산한다.
 * null이면 브라우저 기본 이동에 맡긴다.
 */
export function getWrappedFocusIndex(args: {
  currentIndex: number;
  count: number;
  shiftKey: boolean;
}): number | null {
  const { currentIndex, count, shiftKey } = args;
  if (count <= 0) return null;
  if (shiftKey) {
    return currentIndex <= 0 ? count - 1 : null;
  }
  return currentIndex === -1 || currentIndex >= count - 1 ? 0 : null;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hasAttribute("inert") && element.getAttribute("aria-hidden") !== "true");
}

type UseModalFocusOptions = {
  active: boolean;
  /** Escape 키 처리. 지정하지 않으면 Escape로 닫을 수 없는 다이얼로그로 취급한다. */
  onEscape?: () => void;
};

/**
 * 모달 다이얼로그 공통 키보드 접근성:
 * - 열릴 때 `[data-autofocus]` 요소(없으면 첫 포커스 가능 요소)로 포커스 이동
 * - Tab/Shift+Tab 포커스 트랩
 * - Escape → onEscape
 * - 닫힐 때 열기 전 포커스 위치로 복귀
 */
export function useModalFocus<T extends HTMLElement>({ active, onEscape }: UseModalFocusOptions) {
  const containerRef = useRef<T>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container || typeof document === "undefined") return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    if (!container.contains(document.activeElement)) {
      const initialTarget =
        container.querySelector<HTMLElement>("[data-autofocus]") ??
        getFocusableElements(container)[0] ??
        container;
      initialTarget.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!container) return;

      if (event.key === "Escape") {
        if (!onEscapeRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const nextIndex = getWrappedFocusIndex({
        currentIndex: focusable.indexOf(document.activeElement as HTMLElement),
        count: focusable.length,
        shiftKey: event.shiftKey,
      });
      if (nextIndex !== null) {
        event.preventDefault();
        focusable[nextIndex].focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return containerRef;
}
