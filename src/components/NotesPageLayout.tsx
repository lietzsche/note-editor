import {
  useEffect,
  useState,
  type ChangeEventHandler,
  type CSSProperties,
  type FormEventHandler,
  type ReactNode,
} from "react";
import type { Group, Note } from "../lib/api";
import {
  buildSearchPreviews,
  countMatchRanges,
  findMatchRange,
  splitHighlightSegments,
} from "../lib/noteSearchHighlight";
import { CharacterCountIndicator } from "./CharacterCountIndicator";
import { CopyAllButton } from "./CopyAllButton";
import { PerformanceDebugPanel } from "./PerformanceDebugPanel";
import { ShareStatusPanel } from "./ShareStatusPanel";
import { SpellCheckLink } from "./SpellCheckLink";
import { SortableGroupList } from "./SortableGroupList";
import { SortableNoteList } from "./SortableNoteList";
import { TRASH_NOTES_SCOPE_KEY } from "../lib/noteCache";
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
  isTrashView: boolean;
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
  selectedNoteDeletedAtLabel: string | null;
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
  searchContextVisible?: boolean;
  showAdminConsoleButton?: boolean;
  passwordChangeRequired?: boolean;
  onLogout: () => void;
  onOpenAccountSecurity: () => void;
  onOpenAdminConsole?: () => void;
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
  onRestoreNote: (noteId: string) => void;
  onPermanentDeleteNote: (noteId: string) => void;
  onMoveNoteGroup: (note: Note, groupId: string | null) => void;
  onReorderNotes: (nextNotes: Note[]) => void;
  onTitleChange: ChangeEventHandler<HTMLInputElement>;
  onContentChange: ChangeEventHandler<HTMLTextAreaElement>;
  onMoveSelectedNoteGroup: (groupId: string | null) => void;
  onRetrySave: () => void;
  onOpenConflictDialog: () => void;
  onCopy: () => void;
  onShowSearchContext?: () => void;
  onHideSearchContext?: () => void;
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
  shareError: string | null;
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
  isTrashView,
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
  selectedNoteDeletedAtLabel,
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
  searchContextVisible = true,
  showAdminConsoleButton = false,
  passwordChangeRequired = false,
  onLogout,
  onOpenAccountSecurity,
  onOpenAdminConsole,
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
  onRestoreNote,
  onPermanentDeleteNote,
  onMoveNoteGroup,
  onReorderNotes,
  onTitleChange,
  onContentChange,
  onMoveSelectedNoteGroup,
  onRetrySave,
  onOpenConflictDialog,
  onCopy,
  onShowSearchContext,
  onHideSearchContext,
  onDialogPrimaryAction,
  onDialogDiscardAction,
  onDialogCancelAction,
  shareInfo,
  shareLoading,
  shareError,
  onShareToggle,
}: Props) {
  const [contentMatchIndex, setContentMatchIndex] = useState(0);
  const isSelectedNoteReadOnly = selectedNote?.deleted_at != null;
  const isEditorSearchActive = Boolean(selectedNote && searchQuery.trim());
  const titleMatch = isEditorSearchActive ? findMatchRange(title, searchQuery) : null;
  const contentPreviews = isEditorSearchActive ? buildSearchPreviews(content, searchQuery) : [];
  const activeContentMatchIndex = contentPreviews.length > 0
    ? Math.min(contentMatchIndex, contentPreviews.length - 1)
    : 0;
  const contentPreview = contentPreviews[activeContentMatchIndex] ?? null;
  const titleMatchCount = isEditorSearchActive ? countMatchRanges(title, searchQuery) : 0;
  const contentMatchCount = isEditorSearchActive ? countMatchRanges(content, searchQuery) : 0;
  const totalMatchCount = titleMatchCount + contentMatchCount;
  const showSearchContextPanel = searchContextVisible && totalMatchCount > 0;
  const hasHiddenSearchContext = !searchContextVisible && totalMatchCount > 0;

  useEffect(() => {
    setContentMatchIndex(0);
  }, [content, searchQuery, selectedNote?.id]);

  function goToPreviousContentMatch() {
    setContentMatchIndex(Math.max(0, activeContentMatchIndex - 1));
  }

  function goToNextContentMatch() {
    setContentMatchIndex(Math.min(contentPreviews.length - 1, activeContentMatchIndex + 1));
  }

  return (
    <div
      style={{
        ...styles.layout,
        ...(isMobile ? styles.layoutMobile : {}),
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
            aria-label="그룹 패널"
            title="그룹"
          >
            <GroupsIcon />
            <span style={styles.visuallyHidden}>그룹</span>
          </button>
          <button
            type="button"
            style={{
              ...styles.mobileTabButton,
              ...(mobilePanel === "notes" ? styles.mobileTabButtonActive : {}),
            }}
            onClick={() => setMobilePanel("notes")}
            aria-pressed={mobilePanel === "notes"}
            aria-label="노트 목록 패널"
            title="노트"
          >
            <NotesIcon />
            <span style={styles.visuallyHidden}>노트</span>
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
            aria-label="편집 패널"
            title="편집"
          >
            <EditIcon />
            <span style={styles.visuallyHidden}>편집</span>
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
              <div style={isMobile ? styles.mobileHeaderActions : { display: "flex", gap: "8px", alignItems: "center" }}>
                <ThemeToggle compact />
                {showAdminConsoleButton && onOpenAdminConsole && (
                  <button
                    type="button"
                    style={isMobile ? styles.mobileHeaderIconButton : styles.adminBtn}
                    onClick={onOpenAdminConsole}
                    aria-label="운영 패널 열기"
                    title="운영 패널 열기"
                  >
                    {isMobile ? <AdminIcon /> : "운영"}
                  </button>
                )}
                <button
                  type="button"
                  style={isMobile ? styles.mobileHeaderIconButton : styles.logoutBtn}
                  onClick={onLogout}
                  title="로그아웃"
                  aria-label="로그아웃"
                >
                  {isMobile ? <LogoutIcon /> : "로그아웃"}
                </button>
              </div>
            </div>
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userInfoHeader}>
              <div style={styles.userIdentity}>
                <span style={styles.userInfoLabel}>로그인 계정</span>
                <strong style={styles.userInfoName}>@{username}</strong>
              </div>
              <button
                type="button"
                style={{
                  ...(isMobile ? styles.accountIconButton : styles.accountBtn),
                  ...(passwordChangeRequired ? styles.accountBtnAlert : {}),
                }}
                onClick={onOpenAccountSecurity}
                aria-label={passwordChangeRequired ? "보안 설정 필요" : "계정 보안"}
                title={passwordChangeRequired ? "보안 설정 필요" : "계정 보안"}
              >
                {isMobile ? <SecurityIcon alert={passwordChangeRequired} /> : passwordChangeRequired ? "보안 설정 필요" : "계정 보안"}
              </button>
            </div>
            <p
              style={passwordChangeRequired ? styles.userInfoAlert : styles.userInfoHint}
            >
              {passwordChangeRequired
                ? "임시 비밀번호로 로그인했습니다. 계속 사용하려면 새 비밀번호를 설정하세요."
                : "비밀번호 변경과 계정 복구 안내는 계정 보안 패널에서 확인합니다."}
            </p>
          </div>
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
            <div
              style={{
                ...styles.groupRow,
                ...(isTrashView ? styles.activeGroup : {}),
              }}
            >
              <button
                type="button"
                style={{
                  ...styles.groupSelectButton,
                  ...(styles.trashGroupButton ?? {}),
                }}
                onClick={() => onSelectGroup(TRASH_NOTES_SCOPE_KEY)}
                aria-pressed={isTrashView}
              >
                휴지통
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
            {!isTrashView && (
              <button
                type="button"
                style={isMobile ? styles.noteListIconButton : styles.newNoteBtn}
                onClick={onCreateNote}
                aria-label="새 노트 만들기"
                title="새 노트 만들기"
              >
                {isMobile ? <NewNoteIcon /> : "+ 새 노트"}
              </button>
            )}
          </div>
          {!isTrashView && (
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
                  style={isMobile ? styles.noteSearchClearIconButton : styles.noteSearchClearBtn}
                  onClick={onClearSearch}
                  aria-label="검색 지우기"
                  title="검색 지우기"
                >
                  {isMobile ? <CloseIcon /> : "지우기"}
                </button>
              )}
            </div>
          )}
          <div style={styles.noteListBody}>
            {notesLoadState === "loading" && notes.length === 0 && (
              <div style={styles.empty}>노트 목록을 불러오는 중입니다.</div>
            )}
            {notesLoadState === "error" && notes.length === 0 && (
              <div style={styles.empty}>노트 목록을 불러오지 못했습니다.</div>
            )}
            {!isTrashView && notesLoadState !== "loading" && notesLoadState !== "error" && notes.length === 0 && searchQuery.trim() && (
              <div style={styles.empty}>검색 결과가 없습니다.</div>
            )}
            {notesLoadState !== "loading" && notesLoadState !== "error" && notes.length === 0 && (
              <div style={styles.empty}>
                {isTrashView ? "휴지통이 비어 있습니다." : "노트가 없습니다."}
              </div>
            )}
            {notes.length > 0 && (
              <SortableNoteList
                notes={notes}
                groups={groups}
                defaultGroupId={defaultGroupId}
                selectedNoteId={selectedNote?.id ?? null}
                isMobile={isMobile}
                searchQuery={searchQuery}
                disabled={isTrashView || noteReorderBusy || Boolean(searchQuery.trim())}
                mode={isTrashView ? "trash" : "active"}
                onSelectNote={onSelectNote}
                onDeleteNote={onDeleteNote}
                onRestoreNote={onRestoreNote}
                onPermanentDeleteNote={onPermanentDeleteNote}
                onMoveNoteGroup={onMoveNoteGroup}
                onReorder={onReorderNotes}
              />
            )}
          </div>
        </div>
      )}

      {showEditorPanel && (
        <div style={{ ...styles.editor, ...(isMobile ? styles.editorMobile : {}) }}>
          {selectedNote ? (
            <>
              <div style={{ ...styles.editorToolbar, ...(isMobile ? styles.editorToolbarMobile : {}) }}>
                <div style={{ ...styles.editorPrimaryRow, ...(isMobile ? styles.editorPrimaryRowMobile : {}) }}>
                  <input
                    style={{ ...styles.titleInput, ...(isMobile ? styles.titleInputMobile : {}) }}
                    placeholder="제목"
                    value={title}
                    onChange={onTitleChange}
                    maxLength={120}
                    aria-label="노트 제목"
                    readOnly={isSelectedNoteReadOnly}
                  />
                  {groups.length > 0 && (
                    <label style={{ ...styles.groupPicker, ...(isMobile ? styles.groupPickerMobile : {}) }}>
                      <span style={{ ...styles.groupPickerLabel, ...(isMobile ? styles.visuallyHidden : {}) }}>
                        그룹
                      </span>
                      <select
                        style={{ ...styles.groupPickerSelect, ...(isMobile ? styles.groupPickerSelectMobile : {}) }}
                        value={selectedNoteGroupValue}
                        onChange={(event) => onMoveSelectedNoteGroup(
                          defaultGroupId && event.target.value === defaultGroupId ? null : event.target.value
                        )}
                        aria-label="현재 노트 그룹 선택"
                        disabled={isSelectedNoteReadOnly}
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
                      ...(isMobile ? styles.toolbarRightMobile : {}),
                    }}
                    aria-live="polite"
                  >
                    <span
                      style={{
                        ...styles.statusBadge,
                        color:
                          isSelectedNoteReadOnly ? "var(--color-text-secondary)" :
                          saveStatus === "error" || saveStatus === "conflict" ? "var(--color-danger)" :
                          saveStatus === "dirty" || saveStatus === "saving"
                            ? "var(--color-text-secondary)"
                            : "var(--color-success)",
                      }}
                    >
                      {saveLabel}
                    </span>
                    <CharacterCountIndicator count={charCount} state={countStatus} />
                    {!isSelectedNoteReadOnly && saveStatus === "error" && (
                      <button
                        type="button"
                        style={isMobile ? styles.toolbarIconButton : styles.secondaryActionBtn}
                        onClick={onRetrySave}
                        aria-label="저장 다시 시도"
                        title="저장 다시 시도"
                      >
                        {isMobile ? <RetryIcon /> : "다시 시도"}
                      </button>
                    )}
                    {!isSelectedNoteReadOnly && saveStatus === "conflict" && (
                      <button
                        type="button"
                        style={isMobile ? styles.toolbarIconButton : styles.secondaryActionBtn}
                        onClick={onOpenConflictDialog}
                        aria-label="저장 충돌 해결"
                        title="저장 충돌 해결"
                      >
                        {isMobile ? <ConflictIcon /> : "충돌 해결"}
                      </button>
                    )}
                    {!isSelectedNoteReadOnly && (
                      <SpellCheckLink
                        compact={isMobile}
                        style={isMobile ? styles.toolbarIconButton : styles.secondaryActionBtn}
                        containerStyle={isMobile ? styles.spellCheckMobileContainer : undefined}
                        guidanceStyle={isMobile ? styles.mobileHidden : undefined}
                      />
                    )}
                    {hasHiddenSearchContext && onShowSearchContext && (
                      <button
                        type="button"
                        style={isMobile ? styles.toolbarIconButton : styles.secondaryActionBtn}
                        onClick={onShowSearchContext}
                        aria-label="검색 정보 다시 보기"
                        title="검색 정보 다시 보기"
                      >
                        {isMobile ? <SearchInfoIcon /> : "검색 정보"}
                      </button>
                    )}
                    <CopyAllButton onCopy={onCopy} state={copyStatus} compact={isMobile} />
                    {isMobile && !isSelectedNoteReadOnly && (
                      <ShareStatusPanel
                        styles={styles}
                        shareInfo={shareInfo}
                        shareLoading={shareLoading}
                        shareError={shareError}
                        onShareToggle={onShareToggle}
                        size="xs"
                      />
                    )}
                  </div>
                </div>
                {!isMobile && !isSelectedNoteReadOnly && (
                  <ShareStatusPanel
                    styles={styles}
                    shareInfo={shareInfo}
                    shareLoading={shareLoading}
                    shareError={shareError}
                    onShareToggle={onShareToggle}
                    size="md"
                  />
                )}
              </div>
              {showSearchContextPanel && (
                <div style={styles.searchContextPanel} aria-live="polite">
                  <div style={styles.searchContextHeader}>
                    <span style={styles.searchContextEyebrow}>SEARCH MATCH</span>
                    <div style={styles.searchContextHeaderActions}>
                      <span style={styles.searchContextBadge}>총 {totalMatchCount}개 일치</span>
                      {onHideSearchContext && (
                        <button
                          type="button"
                          style={isMobile ? styles.searchContextDismissIconButton : styles.searchContextDismissButton}
                          onClick={onHideSearchContext}
                          aria-label="검색 정보 숨기기"
                          title="검색 정보 숨기기"
                        >
                          {isMobile ? <CloseIcon /> : "숨기기"}
                        </button>
                      )}
                    </div>
                  </div>
                  {titleMatch && (
                    <div style={styles.searchContextRow}>
                      <div style={styles.searchContextRowHeader}>
                        <span style={styles.searchContextLabel}>제목</span>
                        <span style={styles.searchContextCount}>{titleMatchCount}개</span>
                      </div>
                      <div style={styles.searchContextValue}>
                        {renderEditorHighlightedText(title || "(제목 없음)", searchQuery, styles.searchContextHighlight)}
                      </div>
                    </div>
                  )}
                  {contentPreview && (
                    <div style={styles.searchContextRow}>
                      <div style={styles.searchContextRowHeader}>
                        <span style={styles.searchContextLabel}>본문</span>
                        {contentMatchCount > 1 ? (
                          <div style={styles.searchContextNavigator}>
                            <button
                              type="button"
                              style={{
                                ...styles.searchContextNavButton,
                                ...(activeContentMatchIndex === 0 ? styles.searchContextNavButtonDisabled : {}),
                              }}
                              onClick={goToPreviousContentMatch}
                              disabled={activeContentMatchIndex === 0}
                              aria-label="이전 본문 검색 일치 보기"
                              title="이전 일치"
                            >
                              <ChevronLeftIcon />
                            </button>
                            <span style={styles.searchContextCount} aria-live="polite">
                              {activeContentMatchIndex + 1} / {contentMatchCount}
                            </span>
                            <button
                              type="button"
                              style={{
                                ...styles.searchContextNavButton,
                                ...(activeContentMatchIndex >= contentPreviews.length - 1 ? styles.searchContextNavButtonDisabled : {}),
                              }}
                              onClick={goToNextContentMatch}
                              disabled={activeContentMatchIndex >= contentPreviews.length - 1}
                              aria-label="다음 본문 검색 일치 보기"
                              title="다음 일치"
                            >
                              <ChevronRightIcon />
                            </button>
                          </div>
                        ) : (
                          <span style={styles.searchContextCount}>{contentMatchCount}개</span>
                        )}
                      </div>
                      <div style={styles.searchContextValue}>
                        {contentPreview.hasLeadingEllipsis ? "..." : ""}
                        {renderEditorPreviewHighlight(contentPreview, styles.searchContextHighlight)}
                        {contentPreview.hasTrailingEllipsis ? "..." : ""}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {isSelectedNoteReadOnly && selectedNoteDeletedAtLabel && (
                <div style={styles.readOnlyBanner}>
                  휴지통에 보관된 노트입니다. {selectedNoteDeletedAtLabel}에 삭제되었습니다.
                </div>
              )}
              <textarea
                style={{ ...styles.textarea, ...(isMobile ? styles.textareaMobile : {}) }}
                placeholder="본문을 입력하세요..."
                value={content}
                onChange={onContentChange}
                maxLength={20000}
                aria-label="노트 본문"
                readOnly={isSelectedNoteReadOnly}
              />
            </>
          ) : (
            <div style={styles.noNote}>
              {isTrashView ? "휴지통 노트를 선택해 내용을 확인하세요." : "노트를 선택하거나 새 노트를 만드세요."}
            </div>
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

function renderEditorHighlightedText(
  text: string,
  query: string,
  highlightStyle: CSSProperties
) {
  const segments = splitHighlightSegments(text, query);
  return segments.map((segment, index) => (
    <span
      key={`${segment.highlighted ? "hit" : "plain"}-${index}-${segment.text}`}
      style={segment.highlighted ? highlightStyle : undefined}
    >
      {segment.text}
    </span>
  ));
}

function renderEditorPreviewHighlight(
  preview: {
    text: string;
    matchStart: number;
    matchEnd: number;
  },
  highlightStyle: CSSProperties
): ReactNode {
  return (
    <>
      {preview.text.slice(0, preview.matchStart)}
      <span style={highlightStyle}>
        {preview.text.slice(preview.matchStart, preview.matchEnd)}
      </span>
      {preview.text.slice(preview.matchEnd)}
    </>
  );
}

function GroupsIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2h8l4 4v16H4V2h4Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function RetryIcon() {
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
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function ConflictIcon() {
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
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="m10.29 3.86-8.2 14.2A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.73-2.94l-8.2-14.2a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function AdminIcon() {
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
      <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function LogoutIcon() {
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
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 19V5" />
    </svg>
  );
}

function SecurityIcon({ alert }: { alert: boolean }) {
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
      <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4Z" />
      {alert ? (
        <>
          <path d="M12 8v5" />
          <path d="M12 17h.01" />
        </>
      ) : (
        <path d="M9 12l2 2 4-4" />
      )}
    </svg>
  );
}

function NewNoteIcon() {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M12 12v6" />
      <path d="M9 15h6" />
    </svg>
  );
}

function CloseIcon() {
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
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function SearchInfoIcon() {
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
      <path d="M10.5 18a7.5 7.5 0 1 1 5.3-12.8 7.5 7.5 0 0 1-5.3 12.8Z" />
      <path d="M16 16l5 5" />
      <path d="M10.5 8v.01" />
      <path d="M10.5 11v4" />
    </svg>
  );
}
