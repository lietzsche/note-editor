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
import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(group.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const editInputRef = useRef<HTMLInputElement | null>(null);

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
    disabled: isSortingDisabled || isEditing || isConfirmingDelete,
  });

  useEffect(() => {
    setDraftName(group.name);
  }, [group.name]);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  function startEditing() {
    setDraftName(group.name);
    setIsConfirmingDelete(false);
    setIsEditing(true);
  }

  function submitRename() {
    const trimmed = draftName.trim();
    setIsEditing(false);
    if (!trimmed || trimmed === group.name) {
      setDraftName(group.name);
      return;
    }
    onRenameGroup(group.id, trimmed);
  }

  function cancelEditing() {
    setDraftName(group.name);
    setIsEditing(false);
  }

  const showRowActions = showActions && (isActive || isHovered || isFocusedWithin || isEditing || isConfirmingDelete);

  const rowStyle: CSSProperties = {
    ...styles.groupRow,
    ...(isHovered && !isActive ? styles.groupRowHover : {}),
    ...(isActive ? styles.activeGroup : {}),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
    boxShadow: isDragging ? "var(--shadow-md)" : undefined,
    position: "relative",
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={rowStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsConfirmingDelete(false);
      }}
      onFocus={() => setIsFocusedWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocusedWithin(false);
          setIsConfirmingDelete(false);
        }
      }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        style={{
          ...styles.dragHandle,
          ...(isActive ? styles.activeIconButton : {}),
          ...(!isActive && !isHovered && !isFocusedWithin ? styles.subtleHandleHidden : {}),
          ...(isSortingDisabled || isEditing ? styles.disabledHandle : {}),
        }}
        aria-label={`${group.name} 그룹 순서 변경`}
        title="그룹 순서 변경"
        disabled={isSortingDisabled || isEditing}
        {...attributes}
        {...listeners}
      >
        ≡
      </button>
      {isEditing ? (
        <form
          style={styles.inlineEditForm}
          onSubmit={(event) => {
            event.preventDefault();
            submitRename();
          }}
        >
          <input
            ref={editInputRef}
            type="text"
            style={{
              ...styles.inlineEditInput,
              ...(isActive ? styles.inlineEditInputActive : {}),
            }}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEditing();
              }
            }}
            aria-label={`${group.name} 새 그룹 이름`}
            maxLength={40}
          />
          <button
            type="submit"
            style={{
              ...styles.iconButton,
              ...(isActive ? styles.activeIconButton : {}),
            }}
            aria-label="그룹 이름 저장"
            title="저장"
          >
            저장
          </button>
          <button
            type="button"
            style={{
              ...styles.iconButton,
              ...(isActive ? styles.activeIconButton : {}),
            }}
            onClick={cancelEditing}
            aria-label="그룹 이름 변경 취소"
            title="취소"
          >
            취소
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            style={styles.groupSelectButton}
            onClick={() => onSelectGroup(group.id)}
            aria-pressed={isActive}
          >
            {group.name}
          </button>
          {showActions && (
            <div
              style={{
                ...styles.groupActionButtons,
                ...(!showRowActions ? styles.subtleHandleHidden : {}),
              }}
            >
              {isConfirmingDelete ? (
                <>
                  <button
                    type="button"
                    style={styles.dangerConfirmButton}
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      onDeleteGroup(group.id, group.name);
                    }}
                    title="그룹 삭제 확인 (소속 노트는 미분류로 이동)"
                    aria-label={`${group.name} 그룹 삭제 확인`}
                  >
                    삭제 확인
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.iconButton,
                      ...(isActive ? styles.activeIconButton : {}),
                    }}
                    onClick={() => setIsConfirmingDelete(false)}
                    aria-label="그룹 삭제 취소"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    style={{
                      ...styles.iconButton,
                      ...(isActive ? styles.activeIconButton : {}),
                    }}
                    onClick={startEditing}
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
                    onClick={() => setIsConfirmingDelete(true)}
                    title="그룹 삭제"
                    aria-label={`${group.name} 그룹 삭제`}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          )}
        </>
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
    margin: "2px 0",
    borderRadius: "var(--radius-md)",
    background: "transparent",
    transition: "background-color var(--motion-fast) var(--easing-standard)",
  } satisfies CSSProperties,
  groupRowHover: {
    background: "var(--app-hover-bg)",
  } satisfies CSSProperties,
  activeGroup: {
    background: "var(--color-bg-emphasis)",
    color: "var(--color-text-inverse)",
    boxShadow: "var(--shadow-sm)",
  } satisfies CSSProperties,
  groupSelectButton: {
    flex: 1,
    minWidth: 0,
    minHeight: "40px",
    padding: "6px 8px 6px 2px",
    textAlign: "left",
    color: "inherit",
    fontSize: "13px",
    background: "none",
    border: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,
  inlineEditForm: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: "4px",
    paddingRight: "4px",
  } satisfies CSSProperties,
  inlineEditInput: {
    flex: 1,
    minWidth: 0,
    minHeight: "32px",
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border-strong)",
    background: "var(--color-bg-surface)",
    color: "var(--color-text-primary)",
    fontSize: "12px",
    outline: "none",
  } satisfies CSSProperties,
  inlineEditInputActive: {
    borderColor: "var(--color-brand-primary)",
  } satisfies CSSProperties,
  groupActionButtons: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    paddingRight: "4px",
    transition: "opacity var(--motion-fast) var(--easing-standard)",
  } satisfies CSSProperties,
  dragHandle: {
    minWidth: "28px",
    width: "28px",
    minHeight: "36px",
    padding: "0",
    border: "none",
    background: "none",
    color: "inherit",
    cursor: "grab",
    touchAction: "none",
    fontSize: "15px",
    lineHeight: 1,
    opacity: 0.65,
    transition: "opacity var(--motion-fast) var(--easing-standard)",
  } satisfies CSSProperties,
  subtleHandleHidden: {
    opacity: 0,
  } satisfies CSSProperties,
  disabledHandle: {
    cursor: "default",
    opacity: 0.25,
  } satisfies CSSProperties,
  iconButton: {
    background: "none",
    border: "1px solid transparent",
    borderRadius: "999px",
    color: "inherit",
    opacity: 0.8,
    fontSize: "11px",
    lineHeight: 1,
    padding: "0 6px",
    minHeight: "28px",
    flexShrink: 0,
  } satisfies CSSProperties,
  dangerConfirmButton: {
    background: "var(--color-danger)",
    border: "1px solid var(--color-danger)",
    borderRadius: "999px",
    color: "var(--color-text-inverse)",
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1,
    padding: "0 8px",
    minHeight: "28px",
    flexShrink: 0,
  } satisfies CSSProperties,
  activeIconButton: {
    color: "inherit",
  } satisfies CSSProperties,
};
