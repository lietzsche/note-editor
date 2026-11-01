import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { Group, Note } from "../lib/api";
import {
  buildSearchPreview,
  splitHighlightSegments,
} from "../lib/noteSearchHighlight";
import { moveItem } from "../lib/noteOrder";

type Mode = "active" | "trash";

type Props = {
  notes: Note[];
  groups: Group[];
  defaultGroupId: string | null;
  selectedNoteId: string | null;
  isMobile: boolean;
  searchQuery?: string;
  disabled?: boolean;
  mode?: Mode;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onPermanentDeleteNote: (noteId: string) => void;
  onMoveNoteGroup?: (note: Note, groupId: string | null) => void;
  onReorder: (nextNotes: Note[]) => void;
};

type RowProps = {
  note: Note;
  groups: Group[];
  defaultGroupId: string | null;
  isActive: boolean;
  isMobile: boolean;
  searchQuery: string;
  isSortingDisabled: boolean;
  mode: Mode;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onPermanentDeleteNote: (noteId: string) => void;
};

function formatNoteTimestamp(note: Note, mode: Mode) {
  const timestamp = mode === "trash" ? note.deleted_at ?? note.updated_at : note.updated_at;
  return new Date(timestamp).toLocaleString(
    "ko-KR",
    mode === "trash"
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" }
  );
}

function SortableNoteRow({
  note,
  groups,
  defaultGroupId,
  isActive,
  isMobile,
  searchQuery,
  isSortingDisabled,
  mode,
  onSelectNote,
  onDeleteNote,
  onRestoreNote,
  onPermanentDeleteNote,
}: RowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const [confirmingPermanentDelete, setConfirmingPermanentDelete] = useState(false);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note.id,
    disabled: isSortingDisabled,
  });

  const noteGroupName = getNoteGroupName(note.group_id, groups, defaultGroupId);
  const isSearchActive = searchQuery.trim().length > 0;
  const contentPreview = isSearchActive ? buildSearchPreview(note.content, searchQuery) : null;
  const showControls = isMobile || isActive || isHovered || isFocusedWithin || isDragging;
  const itemStyle: CSSProperties = {
    ...styles.noteItem,
    ...(mode === "trash" ? styles.noteItemTrash : {}),
    ...(isHovered && !isActive ? styles.noteItemHover : {}),
    ...(isActive ? styles.activeNote : {}),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.94 : 1,
    boxShadow: isDragging ? "var(--shadow-md)" : undefined,
    position: "relative",
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setConfirmingPermanentDelete(false);
      }}
      onFocus={() => setIsFocusedWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocusedWithin(false);
          setConfirmingPermanentDelete(false);
        }
      }}
    >
      <div style={styles.noteRow}>
        {mode === "active" && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            style={{
              ...styles.dragHandle,
              ...(!showControls ? styles.subtleControlHidden : {}),
              ...(isSortingDisabled ? styles.disabledHandle : {}),
            }}
            aria-label={`${note.title || "제목 없음"} 노트 순서 변경`}
            title="노트 순서 변경"
            disabled={isSortingDisabled}
            {...attributes}
            {...listeners}
          >
            ≡
          </button>
        )}
        <button
          type="button"
          style={styles.noteSelectButton}
          onClick={() => onSelectNote(note)}
          aria-pressed={isActive}
          aria-label={`${note.title || "제목 없음"} 노트 열기`}
        >
          <div style={styles.noteTitle}>
            {renderHighlightedText(note.title || "(제목 없음)", searchQuery)}
          </div>
          {contentPreview && (
            <div style={styles.notePreview}>
              {contentPreview.hasLeadingEllipsis ? "..." : ""}
              {renderPreviewHighlight(contentPreview)}
              {contentPreview.hasTrailingEllipsis ? "..." : ""}
            </div>
          )}
          <div style={styles.noteMetaRow}>
            <span style={styles.noteDate}>
              {mode === "trash" ? "삭제됨 " : ""}
              {formatNoteTimestamp(note, mode)}
            </span>
            {mode === "active" && (
              <span style={styles.noteGroupBadge}>{noteGroupName}</span>
            )}
          </div>
        </button>
        <div
          style={{
            ...styles.noteActions,
            ...(isMobile ? styles.noteActionsMobile : styles.noteActionsCompact),
            ...(!showControls && mode === "active" ? styles.subtleControlHidden : {}),
          }}
        >
          {mode === "trash" ? (
            confirmingPermanentDelete ? (
              <>
                <button
                  type="button"
                  style={{
                    ...styles.permanentDeleteConfirmButton,
                    ...(!isMobile ? styles.permanentDeleteButtonCompact : {}),
                  }}
                  onClick={() => {
                    setConfirmingPermanentDelete(false);
                    onPermanentDeleteNote(note.id);
                  }}
                  aria-label={`${note.title || "제목 없음"} 노트 영구 삭제 확인`}
                >
                  영구 삭제
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.deleteButton,
                    ...(!isMobile ? styles.deleteButtonCompact : {}),
                  }}
                  onClick={() => setConfirmingPermanentDelete(false)}
                  aria-label="영구 삭제 취소"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  style={{
                    ...(isMobile ? styles.noteIconButton : styles.restoreButton),
                    ...(!isMobile ? styles.restoreButtonCompact : {}),
                  }}
                  onClick={() => onRestoreNote(note.id)}
                  title="노트 복원"
                  aria-label={`${note.title || "제목 없음"} 노트 복원`}
                >
                  {isMobile ? <RestoreIcon /> : "복원"}
                </button>
                <button
                  type="button"
                  style={{
                    ...(isMobile ? styles.noteDangerIconButton : styles.permanentDeleteButton),
                    ...(!isMobile ? styles.permanentDeleteButtonCompact : {}),
                  }}
                  onClick={() => setConfirmingPermanentDelete(true)}
                  title="영구 삭제"
                  aria-label={`${note.title || "제목 없음"} 노트 영구 삭제`}
                >
                  {isMobile ? <TrashIcon /> : "삭제"}
                </button>
              </>
            )
          ) : (
            <button
              type="button"
              style={{
                ...(isMobile ? styles.noteIconButton : styles.deleteButton),
                ...(!isMobile ? styles.deleteButtonCompact : {}),
              }}
              onClick={() => onDeleteNote(note.id)}
              title="휴지통으로 이동"
              aria-label={`${note.title || "제목 없음"} 노트 삭제`}
            >
              {isMobile ? <TrashIcon /> : "삭제"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getNoteGroupName(
  groupId: string | null,
  groups: Group[],
  defaultGroupId: string | null
) {
  const resolvedGroupId = groupId ?? defaultGroupId;
  const group = groups.find((candidate) => candidate.id === resolvedGroupId);
  return group?.name ?? "미분류";
}

export function SortableNoteList({
  notes,
  groups,
  defaultGroupId,
  selectedNoteId,
  isMobile,
  searchQuery = "",
  disabled = false,
  mode = "active",
  onSelectNote,
  onDeleteNote,
  onRestoreNote,
  onPermanentDeleteNote,
  onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isSortingDisabled = mode === "trash" || disabled || notes.length < 2;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (isSortingDisabled || !over || active.id === over.id) return;

    const activeIndex = notes.findIndex((note) => note.id === active.id);
    const overIndex = notes.findIndex((note) => note.id === over.id);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return;

    onReorder(moveItem(notes, activeIndex, overIndex));
  }

  if (mode === "trash") {
    return (
      <>
        {notes.map((note) => (
          <SortableNoteRow
            key={note.id}
            note={note}
            groups={groups}
            defaultGroupId={defaultGroupId}
            isActive={selectedNoteId === note.id}
            isMobile={isMobile}
            searchQuery={searchQuery}
            isSortingDisabled
            mode={mode}
            onSelectNote={onSelectNote}
            onDeleteNote={onDeleteNote}
            onRestoreNote={onRestoreNote}
            onPermanentDeleteNote={onPermanentDeleteNote}
          />
        ))}
      </>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={notes.map((note) => note.id)} strategy={verticalListSortingStrategy}>
        {notes.map((note) => (
          <SortableNoteRow
            key={note.id}
            note={note}
            groups={groups}
            defaultGroupId={defaultGroupId}
            isActive={selectedNoteId === note.id}
            isMobile={isMobile}
            searchQuery={searchQuery}
            isSortingDisabled={isSortingDisabled}
            mode={mode}
            onSelectNote={onSelectNote}
            onDeleteNote={onDeleteNote}
            onRestoreNote={onRestoreNote}
            onPermanentDeleteNote={onPermanentDeleteNote}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function renderHighlightedText(text: string, query: string) {
  const segments = splitHighlightSegments(text, query);
  return segments.map((segment, index) => (
    <span
      key={`${segment.highlighted ? "hit" : "plain"}-${index}-${segment.text}`}
      style={segment.highlighted ? styles.searchHighlight : undefined}
    >
      {segment.text}
    </span>
  ));
}

function renderPreviewHighlight(preview: {
  text: string;
  matchStart: number;
  matchEnd: number;
}): ReactNode {
  return (
    <>
      {preview.text.slice(0, preview.matchStart)}
      <span style={styles.searchHighlight}>
        {preview.text.slice(preview.matchStart, preview.matchEnd)}
      </span>
      {preview.text.slice(preview.matchEnd)}
    </>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

const styles = {
  noteItem: {
    margin: "6px 8px",
    padding: "10px 12px",
    border: "1px solid transparent",
    borderRadius: "var(--radius-md)",
    background: "transparent",
    transition: "background-color var(--motion-fast) var(--easing-standard), border-color var(--motion-fast) var(--easing-standard)",
  } satisfies CSSProperties,
  noteItemHover: {
    background: "var(--app-hover-bg)",
  } satisfies CSSProperties,
  noteItemTrash: {
    background: "color-mix(in srgb, var(--color-bg-accent-soft) 28%, transparent)",
  } satisfies CSSProperties,
  activeNote: {
    background: "var(--app-active-bg)",
    borderColor: "color-mix(in srgb, var(--color-brand-primary) 28%, transparent)",
    boxShadow: "var(--shadow-sm)",
    color: "var(--color-text-primary)",
  } satisfies CSSProperties,
  noteRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  } satisfies CSSProperties,
  noteSelectButton: {
    minWidth: 0,
    flex: 1,
    textAlign: "left",
    padding: "0",
    minHeight: "44px",
    background: "none",
    border: "none",
    color: "inherit",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  } satisfies CSSProperties,
  noteTitle: {
    fontWeight: 700,
    fontSize: "14px",
    letterSpacing: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "var(--color-text-primary)",
  } satisfies CSSProperties,
  notePreview: {
    marginTop: "4px",
    fontSize: "12px",
    lineHeight: 1.45,
    color: "var(--color-text-secondary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,
  noteMetaRow: {
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  } satisfies CSSProperties,
  noteDate: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
  } satisfies CSSProperties,
  noteGroupBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "1px 7px",
    borderRadius: "999px",
    background: "color-mix(in srgb, var(--color-bg-accent-soft) 72%, var(--app-control-bg))",
    border: "1px solid var(--color-border-subtle)",
    color: "var(--color-text-secondary)",
    fontSize: "11px",
    fontWeight: 600,
    lineHeight: 1.4,
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,
  searchHighlight: {
    background: "color-mix(in srgb, var(--color-warning, #f4c542) 38%, transparent)",
    color: "inherit",
    borderRadius: "4px",
    padding: "0 1px",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  } satisfies CSSProperties,
  noteActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
    transition: "opacity var(--motion-fast) var(--easing-standard)",
  } satisfies CSSProperties,
  noteActionsCompact: {
    gap: "4px",
  } satisfies CSSProperties,
  noteActionsMobile: {
    gap: "6px",
  } satisfies CSSProperties,
  subtleControlHidden: {
    opacity: 0,
  } satisfies CSSProperties,
  dragHandle: {
    minWidth: "28px",
    width: "28px",
    minHeight: "36px",
    padding: "0",
    border: "1px solid transparent",
    borderRadius: "var(--radius)",
    background: "transparent",
    color: "var(--color-text-muted)",
    cursor: "grab",
    touchAction: "none",
    fontSize: "16px",
    lineHeight: 1,
    flexShrink: 0,
    transition: "opacity var(--motion-fast) var(--easing-standard)",
  } satisfies CSSProperties,
  disabledHandle: {
    cursor: "default",
    opacity: 0.25,
  } satisfies CSSProperties,
  deleteButton: {
    background: "color-mix(in srgb, var(--app-control-bg) 75%, transparent)",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "999px",
    color: "var(--color-text-secondary)",
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "44px",
    minHeight: "44px",
    padding: "0 10px",
  } satisfies CSSProperties,
  deleteButtonCompact: {
    minWidth: "40px",
    minHeight: "30px",
    fontSize: "11px",
    padding: "0 8px",
  } satisfies CSSProperties,
  noteIconButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "44px",
    width: "44px",
    minHeight: "44px",
    padding: 0,
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "999px",
    background: "var(--app-control-bg)",
    color: "var(--color-text-secondary)",
    flexShrink: 0,
  } satisfies CSSProperties,
  noteDangerIconButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "44px",
    width: "44px",
    minHeight: "44px",
    padding: 0,
    border: "1px solid color-mix(in srgb, var(--color-danger) 26%, var(--color-border-subtle))",
    borderRadius: "999px",
    background: "color-mix(in srgb, var(--color-danger) 7%, var(--app-control-bg))",
    color: "var(--color-danger)",
    flexShrink: 0,
  } satisfies CSSProperties,
  restoreButton: {
    background: "var(--color-bg-emphasis)",
    border: "1px solid transparent",
    borderRadius: "999px",
    color: "var(--color-text-inverse)",
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "52px",
    minHeight: "44px",
    padding: "0 12px",
    fontWeight: 700,
  } satisfies CSSProperties,
  restoreButtonCompact: {
    minWidth: "46px",
    minHeight: "30px",
    fontSize: "11px",
    padding: "0 10px",
  } satisfies CSSProperties,
  permanentDeleteButton: {
    background: "color-mix(in srgb, var(--color-danger) 7%, var(--app-control-bg))",
    border: "1px solid color-mix(in srgb, var(--color-danger) 26%, var(--color-border-subtle))",
    borderRadius: "999px",
    color: "var(--color-danger)",
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "52px",
    minHeight: "44px",
    padding: "0 12px",
    fontWeight: 700,
  } satisfies CSSProperties,
  permanentDeleteConfirmButton: {
    background: "var(--color-danger)",
    border: "1px solid var(--color-danger)",
    borderRadius: "999px",
    color: "var(--color-text-inverse)",
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "60px",
    minHeight: "44px",
    padding: "0 10px",
    fontWeight: 700,
  } satisfies CSSProperties,
  permanentDeleteButtonCompact: {
    minWidth: "46px",
    minHeight: "30px",
    fontSize: "11px",
    padding: "0 10px",
  } satisfies CSSProperties,
};
