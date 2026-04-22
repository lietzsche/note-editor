import type {
  ChangeEventHandler,
  CSSProperties,
  FormEventHandler,
} from "react";
import type { Group, Note } from "../lib/api";
import { CharacterCountIndicator } from "./CharacterCountIndicator";
import { CopyAllButton } from "./CopyAllButton";
import { PerformanceDebugPanel } from "./PerformanceDebugPanel";
import { SpellCheckLink } from "./SpellCheckLink";
import { SortableGroupList } from "./SortableGroupList";
import { SortableNoteList } from "./SortableNoteList";
import ThemeToggle from "./ThemeToggle";
import type { PerfSample } from "../lib/performanceDebug";

type MobilePanel = "groups" | "notes" | "editor";
type CountStatus = "count-ready" | "count-stale";
type CopyStatus = "ready" | "copy-success" | "copy-error";

type Props = {
  styles: Record<string, CSSProperties>;
  isMobile: boolean;
  mobilePanel: MobilePanel;
  setMobilePanel: (panel: MobilePanel) => void;
  showGroupsPanel: boolean;
  showNotesPanel: boolean;
  showEditorPanel: boolean;
  username: string;
  groups: Group[];
  selectedGroupId: string | null;
  currentGroupLabel: string;
  defaultGroupId: string | null;
  defaultGroupName: string;
  groupListStatusLabel: string;
  noteListStatusLabel: string;
  notes: Note[];
  totalNotesCount: number;
  notesLoadState: "idle" | "loading" | "refreshing" | "ready" | "error";
  selectedNote: Note | null;
  searchQuery: string;
  selectedNoteGroupValue: string;
  title: string;
  content: string;
  saveLabel: string;
  saveStatus: "saved" | "saving" | "error" | "dirty" | "conflict";
  charCount: number;
  countStatus: CountStatus;
  copyStatus: CopyStatus;
  newGroupName: string;
  groupReorderBusy: boolean;
  noteReorderBusy: boolean;
  dialogMode: "transition" | "conflict" | null;
  dialogTitle: string;
  dialogDescription: string;
  primaryDialogLabel: string;
  isConflictDialog: boolean;
  conflictNote: Note | null;
  hasPendingAction: boolean;
  perfDebugEnabled: boolean;
  perfSamples: PerfSample[];
  onLogout: () => void;
  onSelectGroup: (groupId: string | null) => void;
  onRenameGroup: (groupId: string, groupName: string) => void;
  onDeleteGroup: (groupId: string, groupName: string) => void;
  onReorderGroups: (nextGroups: Group[]) => void;
  onCreateGroup: FormEventHandler<HTMLFormElement>;
  onNewGroupNameChange: ChangeEventHandler<HTMLInputElement>;
  onCreateNote: () => void;
  onSearchQueryChange: ChangeEventHandler<HTMLInputElement>;
  onClearSearch: () => void;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onMoveNoteGroup: (note: Note, groupId: string | null) => void;
  onReorderNotes: (nextNotes: Note[]) => void;
  onTitleChange: ChangeEventHandler<HTMLInputElement>;
  onContentChange: ChangeEventHandler<HTMLTextAreaElement>;
  onMoveSelectedNoteGroup: (groupId: string | null) => void;
  onRetrySave: () => void;
  onOpenConflictDialog: () => void;
  onCopy: () => void;
  onDialogPrimaryAction: () => void;
  onDialogDiscardAction: () => void;
  onDialogCancelAction: () => void;
  shareInfo: {
    share_token: string | null;
    is_active: boolean;
    expires_at: string | null;
    access_count: number;
    share_url: string | null;
  } | null;
  shareLoading: boolean;
  onShareToggle: () => void;
};

export function NotesPageLayout({
  styles,
  isMobile,
  mobilePanel,
  setMobilePanel,
  showGroupsPanel,
  showNotesPanel,
  showEditorPanel,
  username,
  groups,
  selectedGroupId,
  currentGroupLabel,
  defaultGroupId,
  defaultGroupName,
  groupListStatusLabel,
  noteListStatusLabel,
  notes,
  totalNotesCount,
  notesLoadState,
  selectedNote,
  searchQuery,
  selectedNoteGroupValue,
  title,
  content,
  saveLabel,
  saveStatus,
  charCount,
  countStatus,
  copyStatus,
  newGroupName,
  groupReorderBusy,
  noteReorderBusy,
  dialogMode,
  dialogTitle,
  dialogDescription,
  primaryDialogLabel,
  isConflictDialog,
  conflictNote,
  hasPendingAction,
  perfDebugEnabled,
  perfSamples,
  onLogout,
  onSelectGroup,
  onRenameGroup,
  onDeleteGroup,
  onReorderGroups,
  onCreateGroup,
  onNewGroupNameChange,
  onCreateNote,
  onSearchQueryChange,
  onClearSearch,
  onSelectNote,
  onDeleteNote,
  onMoveNoteGroup,
  onReorderNotes,
  onTitleChange,
  onContentChange,
  onMoveSelectedNoteGroup,
  onRetrySave,
  onOpenConflictDialog,
  onCopy,
  onDialogPrimaryAction,
  onDialogDiscardAction,
  onDialogCancelAction,
  shareInfo,
  shareLoading,
  onShareToggle,
}: Props) {
  return (
    <div
      style={{
        ...styles.layout,
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      {isMobile && (
        <nav style={styles.mobileTabs} aria-label="모바일 패널 전환">
          <button
            type="button"
            style={{
              ...styles.mobileTabButton,
              ...(mobilePanel === "groups" ? styles.mobileTabButtonActive : {}),
            }}
            onClick={() => setMobilePanel("groups")}
            aria-pressed={mobilePanel === "groups"}
          >
            그룹
          </button>
          <button
            type="button"
            style={{
              ...styles.mobileTabButton,
              ...(mobilePanel === "notes" ? styles.mobileTabButtonActive : {}),
            }}
            onClick={() => setMobilePanel("notes")}
            aria-pressed={mobilePanel === "notes"}
          >
            노트
          </button>
          <button
            type="button"
            style={{
              ...styles.mobileTabButton,
              ...(mobilePanel === "editor" ? styles.mobileTabButtonActive : {}),
            }}
            onClick={() => {
              if (selectedNote) setMobilePanel("editor");
            }}
            aria-pressed={mobilePanel === "editor"}
            disabled={!selectedNote}
          >
            편집
          </button>
        </nav>
      )}

      {showGroupsPanel && (
        <aside
          style={{
            ...styles.sidebar,
            flex: isMobile ? 1 : undefined,
            minHeight: 0,
            width: isMobile ? "100%" : styles.sidebar.width,
            borderRight: isMobile ? "none" : styles.sidebar.borderRight,
            borderBottom: isMobile ? "1px solid var(--color-border)" : "none",
          }}
        >
          <div style={styles.sidebarHeader}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--font-size-lg)", whiteSpace: "nowrap" }}>노트 그룹</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <ThemeToggle compact={!isMobile} />
                <button
                  type="button"
                  style={styles.logoutBtn}
                  onClick={onLogout}
                  title="로그아웃"
                  aria-label="로그아웃"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
          <div style={styles.userInfo}>{username}</div>
          <div style={styles.groupSectionHeader}>
            <span style={styles.reorderHint}>{groupListStatusLabel}</span>
          </div>

          <div style={styles.groupSection}>
            <div
              style={{
                ...styles.groupRow,
                ...(selectedGroupId === null ? styles.activeGroup : {}),
              }}
            >
              <button
                type="button"
                style={styles.groupSelectButton}
                onClick={() => onSelectGroup(null)}
                aria-pressed={selectedGroupId === null}
              >
                전체 노트
              </button>
            </div>
            <SortableGroupList
              groups={groups}
              selectedGroupId={selectedGroupId}
              defaultGroupName={defaultGroupName}
              disabled={groupReorderBusy}
              onSelectGroup={onSelectGroup}
              onRenameGroup={onRenameGroup}
              onDeleteGroup={onDeleteGroup}
              onReorder={onReorderGroups}
            />
          </div>

          <form onSubmit={onCreateGroup} style={styles.newGroupForm}>
            <input
              style={styles.groupInput}
              placeholder="새 그룹 이름..."
              value={newGroupName}
              onChange={onNewGroupNameChange}
              aria-label="새 그룹 이름"
            />
            <button style={styles.addBtn} type="submit" aria-label="그룹 추가">+</button>
          </form>
        </aside>
      )}

      {showNotesPanel && (
        <div
          style={{
            ...styles.noteList,
            flex: isMobile ? 1 : undefined,
            minHeight: 0,
            width: isMobile ? "100%" : styles.noteList.width,
            borderRight: isMobile ? "none" : styles.noteList.borderRight,
            borderBottom: isMobile ? "1px solid var(--color-border)" : "none",
          }}
        >
          <div style={styles.noteListHeader}>
            <div style={styles.noteListMeta}>
              <span style={{ fontWeight: 600 }}>
                {currentGroupLabel} ({notes.length}{notes.length !== totalNotesCount ? ` / ${totalNotesCount}` : ""})
              </span>
              <span style={styles.reorderHint}>{noteListStatusLabel}</span>
            </div>
            <button
              type="button"
              style={styles.newNoteBtn}
              onClick={onCreateNote}
              aria-label="새 노트 만들기"
            >
              + 새 노트
            </button>
          </div>
          <div style={styles.noteSearchRow}>
            <input
              type="search"
              value={searchQuery}
              onChange={onSearchQueryChange}
              placeholder="노트 검색..."
              aria-label="노트 검색"
              style={styles.noteSearchInput}
            />
            {searchQuery.trim() && (
              <button
                type="button"
                style={styles.noteSearchClearBtn}
                onClick={onClearSearch}
                aria-label="검색 지우기"
              >
                지우기
              </button>
            )}
          </div>
          <div style={styles.noteListBody}>
            {notesLoadState === "loading" && notes.length === 0 && (
              <div style={styles.empty}>노트 목록을 불러오는 중입니다.</div>
            )}
            {notesLoadState === "error" && notes.length === 0 && (
              <div style={styles.empty}>노트 목록을 불러오지 못했습니다.</div>
            )}
            {notesLoadState !== "loading" && notesLoadState !== "error" && notes.length === 0 && searchQuery.trim() && (
              <div style={styles.empty}>검색 결과가 없습니다.</div>
            )}
            {notesLoadState !== "loading" && notesLoadState !== "error" && notes.length === 0 && !searchQuery.trim() && (
              <div style={styles.empty}>노트가 없습니다.</div>
            )}
            {notes.length > 0 && (
              <SortableNoteList
                notes={notes}
                groups={groups}
                defaultGroupId={defaultGroupId}
                selectedNoteId={selectedNote?.id ?? null}
                isMobile={isMobile}
                disabled={noteReorderBusy || Boolean(searchQuery.trim())}
                onSelectNote={onSelectNote}
                onDeleteNote={onDeleteNote}
                onMoveNoteGroup={onMoveNoteGroup}
                onReorder={onReorderNotes}
              />
            )}
          </div>
        </div>
      )}

      {showEditorPanel && (
        <div style={styles.editor}>
          {selectedNote ? (
            <>
              <div style={styles.editorToolbar}>
                <input
                  style={styles.titleInput}
                  placeholder="제목"
                  value={title}
                  onChange={onTitleChange}
                  maxLength={120}
                  aria-label="노트 제목"
                />
                {groups.length > 0 && (
                  <label style={styles.groupPicker}>
                    <span style={styles.groupPickerLabel}>그룹</span>
                    <select
                      style={styles.groupPickerSelect}
                      value={selectedNoteGroupValue}
                      onChange={(event) => onMoveSelectedNoteGroup(
                        defaultGroupId && event.target.value === defaultGroupId ? null : event.target.value
                      )}
                      aria-label="현재 노트 그룹 선택"
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div
                  style={{
                    ...styles.toolbarRight,
                    ...(isMobile
                      ? {
                          width: "100%",
                          marginLeft: 0,
                          flexWrap: "wrap",
                          justifyContent: "flex-start",
                        }
                      : {}),
                  }}
                  aria-live="polite"
                >
                  <span
                    style={{
                      ...styles.statusBadge,
                      color:
                        saveStatus === "error" || saveStatus === "conflict" ? "var(--color-danger)" :
                        saveStatus === "dirty" || saveStatus === "saving"
                          ? "var(--color-text-secondary)"
                          : "var(--color-success)",
                    }}
                  >
                    {saveLabel}
                  </span>
                  <CharacterCountIndicator count={charCount} state={countStatus} />
                  {saveStatus === "error" && (
                    <button
                      type="button"
                      style={styles.secondaryActionBtn}
                      onClick={onRetrySave}
                      aria-label="저장 다시 시도"
                    >
                      다시 시도
                    </button>
                  )}
                  {saveStatus === "conflict" && (
                    <button
                      type="button"
                      style={styles.secondaryActionBtn}
                      onClick={onOpenConflictDialog}
                      aria-label="저장 충돌 해결"
                    >
                      충돌 해결
                    </button>
                  )}
                  <SpellCheckLink
                    content={content}
                    style={styles.secondaryActionBtn}
                    containerStyle={isMobile ? { width: "100%" } : undefined}
                  />
                  <CopyAllButton onCopy={onCopy} state={copyStatus} />
                  {selectedNote && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                      {shareInfo?.is_active ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>공유 중:</span>
                          <a
                            href={shareInfo.share_url ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'underline' }}
                          >
                            링크 열기
                          </a>
                          <button
                            type="button"
                            style={{ ...styles.secondaryActionBtn, marginLeft: '4px' }}
                            onClick={onShareToggle}
                            disabled={shareLoading}
                            aria-label="공유 비활성화"
                          >
                            끄기
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          style={styles.secondaryActionBtn}
                          onClick={onShareToggle}
                          disabled={shareLoading}
                          aria-label="공유 활성화"
                        >
                          {shareLoading ? '처리 중...' : '공유하기'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <textarea
                style={styles.textarea}
                placeholder="본문을 입력하세요..."
                value={content}
                onChange={onContentChange}
                maxLength={20000}
                aria-label="노트 본문"
              />
            </>
          ) : (
            <div style={styles.noNote}>노트를 선택하거나 새 노트를 만드세요.</div>
          )}
        </div>
      )}

      {dialogMode && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="editor-dialog-title">
          <div style={styles.modalCard}>
            <h2 id="editor-dialog-title" style={styles.modalTitle}>{dialogTitle}</h2>
            <p style={styles.modalDescription}>{dialogDescription}</p>
            {isConflictDialog && conflictNote && (
              <div style={styles.conflictGrid}>
                <section style={styles.conflictPanel}>
                  <strong style={styles.conflictPanelTitle}>현재 편집 내용</strong>
                  <div style={styles.conflictPanelBody}>
                    {content || "(빈 본문)"}
                  </div>
                </section>
                <section style={styles.conflictPanel}>
                  <strong style={styles.conflictPanelTitle}>서버 최신 내용</strong>
                  <div style={styles.conflictPanelMeta}>
                    마지막 저장: {new Date(conflictNote.updated_at).toLocaleString("ko-KR")}
                  </div>
                  <div style={styles.conflictPanelBody}>
                    {conflictNote.content || "(빈 본문)"}
                  </div>
                </section>
              </div>
            )}
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.modalPrimaryButton}
                onClick={onDialogPrimaryAction}
              >
                {primaryDialogLabel}
              </button>
              {hasPendingAction && (
                <button
                  type="button"
                  style={styles.modalSecondaryButton}
                  onClick={onDialogDiscardAction}
                >
                  저장하지 않고 진행
                </button>
              )}
              <button
                type="button"
                style={styles.modalGhostButton}
                onClick={onDialogCancelAction}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {perfDebugEnabled && perfSamples.length > 0 && (
        <PerformanceDebugPanel samples={perfSamples} />
      )}
    </div>
  );
}
