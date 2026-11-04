import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { SPELL_CHECK_GUIDANCE, SPELL_CHECK_URL } from "../lib/externalLinks";
import { useBackHandler } from "../lib/useBackHandler";

type Props = {
  onCopy: () => void;
  /** 지정하지 않으면 삭제 항목을 숨긴다. (읽기 전용 노트) */
  onDelete?: () => void;
  showSpellCheck?: boolean;
  compact?: boolean;
  triggerStyle?: CSSProperties;
};

/** 메뉴 항목 사이 키보드 이동 인덱스 계산. 처리하지 않는 키면 null. */
export function getNextMenuIndex(currentIndex: number, count: number, key: string): number | null {
  if (count <= 0) return null;
  switch (key) {
    case "ArrowDown":
      return currentIndex < 0 || currentIndex >= count - 1 ? 0 : currentIndex + 1;
    case "ArrowUp":
      return currentIndex <= 0 ? count - 1 : currentIndex - 1;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

export function EditorMoreMenu({
  onCopy,
  onDelete,
  showSpellCheck = true,
  compact = false,
  triggerStyle,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useBackHandler(isOpen, () => setIsOpen(false));

  function getItems() {
    return Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=\"menuitem\"]") ?? []);
  }

  function closeMenu(options: { restoreFocus?: boolean } = {}) {
    setIsOpen(false);
    if (options.restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    getItems()[0]?.focus();

    function handlePointerDown(event: PointerEvent | MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu({ restoreFocus: true });
      return;
    }
    if (event.key === "Tab") {
      closeMenu();
      return;
    }

    const items = getItems();
    const nextIndex = getNextMenuIndex(
      items.indexOf(document.activeElement as HTMLElement),
      items.length,
      event.key
    );
    if (nextIndex !== null) {
      event.preventDefault();
      items[nextIndex]?.focus();
    }
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" && !isOpen) {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  return (
    <div ref={containerRef} className="editor-menu">
      <button
        ref={triggerRef}
        type="button"
        style={triggerStyle}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label="더보기"
        title="더보기"
      >
        <MoreIcon />
        {!compact && <span>더보기</span>}
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          className="editor-menu__list"
          role="menu"
          aria-label="노트 추가 작업"
          onKeyDown={handleMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            className="editor-menu__item"
            tabIndex={-1}
            onClick={() => {
              closeMenu({ restoreFocus: true });
              onCopy();
            }}
          >
            <CopyIcon />
            <span>본문 전체 복사</span>
          </button>
          {showSpellCheck && (
            <a
              role="menuitem"
              className="editor-menu__item"
              tabIndex={-1}
              href={SPELL_CHECK_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={SPELL_CHECK_GUIDANCE}
              onClick={() => closeMenu()}
            >
              <SpellCheckIcon />
              <span>맞춤법 검사 (새 탭)</span>
            </a>
          )}
          {onDelete && (
            <>
              <div className="editor-menu__divider" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="editor-menu__item editor-menu__item--danger"
                tabIndex={-1}
                onClick={() => {
                  closeMenu();
                  onDelete();
                }}
              >
                <TrashIcon />
                <span>휴지통으로 이동</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function SpellCheckIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 14 4 4L20 6" />
      <path d="M4 6h8" />
      <path d="M4 10h5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}
