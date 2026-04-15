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
import type { CSSProperties } from "react";
import type { Group, Note } from "../lib/api";
import {
  getNoteGroupIdFromSelectValue,
  getNoteGroupSelectValue,
} from "../lib/noteGroupSelect";
import { moveItem } from "../lib/noteOrder";

type Props = {
  notes: Note[];
  groups: Group[];
  defaultGroupId: string | null;
  selectedNoteId: string | null;
  isMobile: boolean;
  disabled?: boolean;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveNoteGroup: (note: Note, groupId: string | null) => void;
  onReorder: (nextNotes: Note[]) => void;
};

type RowProps = {
  note: Note;
  groups: Group[];
  defaultGroupId: string | null;
  isActive: boolean;
  isMobile: boolean;
  isSortingDisabled: boolean;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveNoteGroup: (note: Note, groupId: string | null) => void;
};

function SortableNoteRow({
  note,
  groups,
  defaultGroupId,
  isActive,
  isMobile,
  isSortingDisabled,
  onSelectNote,
  onDeleteNote,
  onMoveNoteGroup,
}: RowProps) {
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

  const noteGroupValue = getNoteGroupSelectValue(note.group_id, defaultGroupId);
  const itemStyle: CSSProperties = {
    ...styles.noteItem,
    ...(isActive ? styles.activeNote : {}),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.94 : 1,
    boxShadow: isDragging ? "0 12px 24px rgba(15, 23, 42, 0.16)" : "none",
    position: "relative",
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={itemStyle}>
      <div style={styles.noteRow}>
        <button
          ref={setActivatorNodeRef}
          type="button"
          style={{
            ...styles.dragHandle,
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
        <button
          type="button"
          style={styles.noteSelectButton}
          onClick={() => onSelectNote(note)}
          aria-pressed={isActive}
          aria-label={`${note.title || "제목 없음"} 노트 열기`}
        >
          <div style={styles.noteTitle}>{note.title || "(제목 없음)"}</div>
          <div style={styles.noteDate}>
            {new Date(note.updated_at).toLocaleDateString("ko-KR")}
          </div>
        </button>
        <div
          style={{
            ...styles.noteActions,
            ...(!isMobile ? styles.noteActionsCompact : {}),
          }}
        >
          <button
            type="button"
            style={{
              ...styles.deleteButton,
              ...(!isMobile ? styles.deleteButtonCompact : {}),
            }}
            onClick={() => onDeleteNote(note.id)}
            title="노트 삭제"
            aria-label={`${note.title || "제목 없음"} 노트 삭제`}
          >
            삭제
          </button>
        </div>
      </div>
      {groups.length > 1 && (
        <div style={styles.noteGroupMoveRow}>
          <select
            style={styles.noteGroupMoveSelect}
            value={noteGroupValue}
            onChange={(event) => {
              onMoveNoteGroup(
                note,
                getNoteGroupIdFromSelectValue(event.target.value, defaultGroupId)
              );
            }}
            aria-label={`${note.title || "Untitled"} note group move`}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function SortableNoteList({
  notes,
  groups,
  defaultGroupId,
  selectedNoteId,
  isMobile,
  disabled = false,
  onSelectNote,
  onDeleteNote,
  onMoveNoteGroup,
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

  const isSortingDisabled = disabled || notes.length < 2;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (isSortingDisabled || !over || active.id === over.id) return;

    const activeIndex = notes.findIndex((note) => note.id === active.id);
    const overIndex = notes.findIndex((note) => note.id === over.id);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return;

    onReorder(moveItem(notes, activeIndex, overIndex));
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
            isSortingDisabled={isSortingDisabled}
            onSelectNote={onSelectNote}
            onDeleteNote={onDeleteNote}
            onMoveNoteGroup={onMoveNoteGroup}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

const styles = {
  noteItem: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    borderLeft: "3px solid transparent",
  } satisfies CSSProperties,
  activeNote: {
    background: "#eff6ff",
    borderLeft: "3px solid var(--color-primary)",
  } satisfies CSSProperties,
  noteRow: {
    display: "flex",
    alignItems: "stretch",
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
  } satisfies CSSProperties,
  noteTitle: {
    fontWeight: 500,
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "var(--color-text-primary)",
  } satisfies CSSProperties,
  noteDate: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
    marginTop: "2px",
  } satisfies CSSProperties,
  noteActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  } satisfies CSSProperties,
  noteActionsCompact: {
    gap: "2px",
  } satisfies CSSProperties,
  noteGroupMoveRow: {
    marginTop: "8px",
  } satisfies CSSProperties,
  noteGroupMoveSelect: {
    width: "100%",
    minHeight: "36px",
    padding: "4px 8px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
    fontSize: "12px",
  } satisfies CSSProperties,
  dragHandle: {
    minWidth: "44px",
    minHeight: "44px",
    padding: "0",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    background: "var(--color-bg)",
    color: "var(--color-text-secondary)",
    cursor: "grab",
    touchAction: "none",
    fontSize: "18px",
    lineHeight: 1,
    flexShrink: 0,
  } satisfies CSSProperties,
  disabledHandle: {
    cursor: "default",
    opacity: 0.45,
  } satisfies CSSProperties,
  deleteButton: {
    background: "none",
    border: "1px solid transparent",
    borderRadius: "var(--radius)",
    color: "var(--color-text-secondary)",
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "44px",
    minHeight: "44px",
  } satisfies CSSProperties,
  deleteButtonCompact: {
    minWidth: "40px",
    minHeight: "32px",
    fontSize: "11px",
  } satisfies CSSProperties,
};
