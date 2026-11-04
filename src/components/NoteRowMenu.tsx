import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getNextMenuIndex } from "./EditorMoreMenu";
import { useBackHandler } from "../lib/useBackHandler";
import "../styles/note-row-menu.css";

const useClientLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

type Props = {
  title: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
};

export function NoteRowMenu({ title, canMoveUp, canMoveDown, onMove, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useBackHandler(open, () => setOpen(false));

  function items() {
    return Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
  }

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }

  useClientLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(trigger.right - menu.width, window.innerWidth - menu.width - 8)),
      top: Math.max(8, Math.min(trigger.bottom + 4, window.innerHeight - menu.height - 8)),
    });
    items()[0]?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    }
    function onScroll(event: Event) {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onResize() { setOpen(false); }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" className="note-row-menu__trigger"
        aria-label={`${title || "제목 없음"} 노트 더보기`}
        title="노트 더보기" aria-haspopup="menu" aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onPointerDown={(event) => {
          // Keep focus in the open menu until click toggles it closed.
          if (open) event.preventDefault();
        }}
        onClick={() => { if (open) close(true); else setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); }
        }}>
        <span aria-hidden="true">⋯</span>
      </button>
      {open && createPortal(
        <div ref={menuRef} id={menuId} role="menu" aria-label={`${title || "제목 없음"} 노트 작업`}
          className="note-row-menu__list" style={position}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
            if (event.key === "Tab") {
              // Return to the row trigger before the browser advances through the list.
              triggerRef.current?.focus();
              close();
              return;
            }
            const enabledItems = items();
            const index = getNextMenuIndex(enabledItems.indexOf(document.activeElement as HTMLButtonElement), enabledItems.length, event.key);
            if (index !== null) { event.preventDefault(); enabledItems[index]?.focus(); }
          }}>
          <button role="menuitem" type="button" tabIndex={-1} disabled={!canMoveUp}
            onClick={() => { close(true); onMove(-1); }}>위로 이동</button>
          <button role="menuitem" type="button" tabIndex={-1} disabled={!canMoveDown}
            onClick={() => { close(true); onMove(1); }}>아래로 이동</button>
          <div role="separator" className="note-row-menu__divider" />
          <button role="menuitem" type="button" tabIndex={-1} className="note-row-menu__danger"
            onClick={() => { close(true); onDelete(); }}>휴지통으로 이동</button>
        </div>, document.body
      )}
    </>
  );
}
