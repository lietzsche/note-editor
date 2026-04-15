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
import type { Group } from "../lib/api";
import { moveItem } from "../lib/noteOrder";

type Props = {
  groups: Group[];
  selectedGroupId: string | null;
  defaultGroupName: string;
  disabled?: boolean;
  onSelectGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  onReorder: (nextGroups: Group[]) => void;
};

type RowProps = {
  group: Group;
  isActive: boolean;
  isSortingDisabled: boolean;
  showActions: boolean;
  onSelectGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
};

function SortableGroupRow({
  group,
  isActive,
  isSortingDisabled,
  showActions,
  onSelectGroup,
  onRenameGroup,
  onDeleteGroup,
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
    id: group.id,
    disabled: isSortingDisabled,
  });

  const rowStyle: CSSProperties = {
    ...styles.groupRow,
    ...(isActive ? styles.activeGroup : {}),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
    boxShadow: isDragging ? "0 12px 24px rgba(15, 23, 42, 0.16)" : "none",
    position: "relative",
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={rowStyle}>
      <button
        ref={setActivatorNodeRef}
        type="button"
        style={{
          ...styles.dragHandle,
          ...(isActive ? styles.activeIconButton : {}),
          ...(isSortingDisabled ? styles.disabledHandle : {}),
        }}
        aria-label={`${group.name} 그룹 순서 변경`}
        title="그룹 순서 변경"
        disabled={isSortingDisabled}
        {...attributes}
        {...listeners}
      >
        ≡
      </button>
      <button
        type="button"
        style={styles.groupSelectButton}
        onClick={() => onSelectGroup(group.id)}
        aria-pressed={isActive}
      >
        {group.name}
      </button>
      {showActions && (
        <div style={styles.groupActionButtons}>
          <button
            type="button"
            style={{
              ...styles.iconButton,
              ...(isActive ? styles.activeIconButton : {}),
            }}
            onClick={() => onRenameGroup(group.id, group.name)}
            title="그룹 이름 변경"
            aria-label={`${group.name} 그룹 이름 변경`}
          >
            편집
          </button>
          <button
            type="button"
            style={{
              ...styles.iconButton,
              ...(isActive ? styles.activeIconButton : {}),
            }}
            onClick={() => onDeleteGroup(group.id, group.name)}
            title="그룹 삭제"
            aria-label={`${group.name} 그룹 삭제`}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export function SortableGroupList({
  groups,
  selectedGroupId,
  defaultGroupName,
  disabled = false,
  onSelectGroup,
  onRenameGroup,
  onDeleteGroup,
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

  const isSortingDisabled = disabled || groups.length < 2;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (isSortingDisabled || !over || active.id === over.id) return;

    const activeIndex = groups.findIndex((group) => group.id === active.id);
    const overIndex = groups.findIndex((group) => group.id === over.id);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return;

    onReorder(moveItem(groups, activeIndex, overIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={groups.map((group) => group.id)} strategy={verticalListSortingStrategy}>
        {groups.map((group) => (
          <SortableGroupRow
            key={group.id}
            group={group}
            isActive={selectedGroupId === group.id}
            isSortingDisabled={isSortingDisabled}
            showActions={group.name !== defaultGroupName}
            onSelectGroup={onSelectGroup}
            onRenameGroup={onRenameGroup}
            onDeleteGroup={onDeleteGroup}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

const styles = {
  groupRow: {
    display: "flex",
    alignItems: "center",
    margin: "1px 4px",
    borderRadius: "4px",
    background: "transparent",
  } satisfies CSSProperties,
  activeGroup: {
    background: "var(--color-primary)",
    color: "#fff",
  } satisfies CSSProperties,
  groupSelectButton: {
    flex: 1,
    minWidth: 0,
    minHeight: "44px",
    padding: "8px 12px 8px 4px",
    textAlign: "left",
    color: "inherit",
    fontSize: "13px",
    background: "none",
    border: "none",
  } satisfies CSSProperties,
  groupActionButtons: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    paddingRight: "4px",
  } satisfies CSSProperties,
  dragHandle: {
    minWidth: "44px",
    minHeight: "44px",
    padding: "0",
    border: "none",
    background: "none",
    color: "var(--color-text-secondary)",
    cursor: "grab",
    touchAction: "none",
    fontSize: "18px",
    lineHeight: 1,
  } satisfies CSSProperties,
  disabledHandle: {
    cursor: "default",
    opacity: 0.45,
  } satisfies CSSProperties,
  iconButton: {
    background: "none",
    border: "none",
    color: "inherit",
    opacity: 0.72,
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "48px",
    minHeight: "44px",
  } satisfies CSSProperties,
  activeIconButton: {
    color: "inherit",
  } satisfies CSSProperties,
};
