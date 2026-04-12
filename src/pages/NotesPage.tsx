import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Group, type Note } from "../lib/api";

type Props = {
  username: string;
  onLogout: () => void;
};

type SaveStatus = "saved" | "saving" | "error" | "dirty";
type MobilePanel = "groups" | "notes" | "editor";

const MOBILE_MEDIA_QUERY = "(max-width: 900px)";
const DEFAULT_GROUP_NAME = "미분류";

export default function NotesPage({ username, onLogout }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [reorderStatus, setReorderStatus] = useState<"idle" | "saving" | "error">("idle");
  const [newGroupName, setNewGroupName] = useState("");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA_QUERY).matches
  );
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("notes");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedNoteIdRef = useRef<string | null>(null);

  const loadGroups = useCallback(async () => {
    const data = await api.groups.list();
    setGroups(data);
  }, []);

  const loadNotes = useCallback(async (groupId?: string) => {
    const data = await api.notes.list(groupId);
    setNotes(data);
  }, []);

  useEffect(() => {
    loadGroups();
    loadNotes();
  }, [loadGroups, loadNotes]);

  useEffect(() => {
    loadNotes(selectedGroupId ?? undefined);
  }, [selectedGroupId, loadNotes]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (mobilePanel === "editor" && !selectedNote) {
      setMobilePanel("notes");
    }
  }, [isMobile, mobilePanel, selectedNote]);

  function selectGroup(groupId: string | null) {
    setSelectedGroupId(groupId);
    if (groupId !== null && selectedNote && selectedNote.group_id !== groupId) {
      clearSelectedNoteView();
      return;
    }
    if (isMobile) {
      setMobilePanel("notes");
    }
  }

  function clearSelectedNoteView() {
    selectedNoteIdRef.current = null;
    setSelectedNote(null);
    setTitle("");
    setContent("");
    setSaveStatus("saved");
    setCopyStatus("idle");
    if (isMobile) {
      setMobilePanel("notes");
    }
  }

  function selectNote(note: Note) {
    selectedNoteIdRef.current = note.id;
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSaveStatus("saved");
    setCopyStatus("idle");
    if (isMobile) {
      setMobilePanel("editor");
    }
  }

  useEffect(() => {
    if (!selectedNote || selectedGroupId === null) return;

    const noteStillVisible = notes.some((note) => note.id === selectedNote.id);
    if (!noteStillVisible) {
      clearSelectedNoteView();
    }
  }, [notes, selectedGroupId, selectedNote, isMobile]);

  async function createNote() {
    const note = await api.notes.create({
      title: "새 노트",
      group_id: selectedGroupId ?? undefined,
    });
    await loadNotes(selectedGroupId ?? undefined);
    selectNote(note);
  }

  async function deleteNote(id: string) {
    if (!window.confirm("노트를 삭제할까요?")) return;
    await api.notes.delete(id);
    if (selectedNote?.id === id) {
      clearSelectedNoteView();
    }
    await loadNotes(selectedGroupId ?? undefined);
  }

  async function moveNote(noteId: string, direction: -1 | 1) {
    if (selectedGroupId !== null || reorderStatus === "saving") return;

    const currentIndex = notes.findIndex((note) => note.id === noteId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= notes.length) return;

    const previousNotes = notes;
    const reorderedNotes = [...notes];
    const [movedNote] = reorderedNotes.splice(currentIndex, 1);
    reorderedNotes.splice(nextIndex, 0, movedNote);

    setNotes(reorderedNotes);
    setReorderStatus("saving");

    try {
      await api.notes.reorder(reorderedNotes.map((note) => note.id));
      setReorderStatus("idle");
    } catch {
      setNotes(previousNotes);
      setReorderStatus("error");
      setTimeout(() => setReorderStatus("idle"), 2000);
    }
  }

  function scheduleAutoSave(noteId: string, t: string, c: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("dirty");
    saveTimerRef.current = setTimeout(async () => {
      if (selectedNoteIdRef.current !== noteId) return;
      setSaveStatus("saving");
      try {
        const updated = await api.notes.update(noteId, { title: t, content: c });
        if (selectedNoteIdRef.current !== noteId) return;
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? updated : n))
        );
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 800);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTitle(v);
    if (selectedNote) scheduleAutoSave(selectedNote.id, v, content);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setContent(v);
    if (selectedNote) scheduleAutoSave(selectedNote.id, title, v);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }

  async function handleLogout() {
    await api.auth.logout();
    onLogout();
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await api.groups.create(newGroupName.trim());
      setNewGroupName("");
      await loadGroups();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "그룹 생성에 실패했습니다.");
    }
  }

  async function handleRenameGroup(id: string, currentName: string) {
    const nextName = window.prompt("새 그룹 이름을 입력하세요.", currentName);
    if (nextName === null) return;

    const normalizedName = nextName.trim();
    if (!normalizedName || normalizedName === currentName) return;

    try {
      await api.groups.update(id, normalizedName);
      await loadGroups();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "그룹 이름 변경에 실패했습니다.");
    }
  }

  async function handleDeleteGroup(id: string, name: string) {
    if (!window.confirm(`"${name}" 그룹을 삭제할까요? 소속 노트는 미분류로 이동됩니다.`)) return;
    const wasSelectedGroup = selectedGroupId === id;
    const selectedNoteWasInGroup = selectedNote?.group_id === id;

    try {
      await api.groups.delete(id);
      if (wasSelectedGroup) setSelectedGroupId(null);
      await loadGroups();
      await loadNotes(wasSelectedGroup ? undefined : selectedGroupId ?? undefined);

      if (selectedNoteWasInGroup && selectedNote) {
        const refreshedNote = await api.notes.get(selectedNote.id);
        selectNote(refreshedNote);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "그룹 삭제에 실패했습니다.");
    }
  }

  async function handleMoveSelectedNoteGroup(groupId: string) {
    if (!selectedNote) return;
    if (groupId === selectedNote.group_id) return;

    try {
      const updatedNote = await api.notes.moveGroup(selectedNote.id, groupId || null);

      if (selectedGroupId !== null && updatedNote.group_id !== selectedGroupId) {
        clearSelectedNoteView();
      } else {
        selectNote(updatedNote);
      }

      await loadNotes(selectedGroupId ?? undefined);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "노트 그룹 이동에 실패했습니다.");
    }
  }

  const charCount = [...new Intl.Segmenter().segment(content)].length;

  const saveLabel =
    saveStatus === "saving" ? "저장 중..." :
    saveStatus === "dirty" ? "미저장" :
    saveStatus === "error" ? "저장 실패" : "저장됨";

  const copyLabel =
    copyStatus === "success" ? "복사됨!" :
    copyStatus === "error" ? "복사 실패" : "전체 복사";

  const reorderLabel =
    reorderStatus === "saving" ? "정렬 저장 중..." :
    reorderStatus === "error" ? "정렬 실패" :
    selectedGroupId === null ? "정렬 가능" : "전체 노트에서 정렬";

  const currentGroupLabel = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId)?.name ?? "그룹"
    : "전체 노트";
  const defaultGroup = groups.find((group) => group.name === DEFAULT_GROUP_NAME) ?? null;
  const selectedNoteGroupValue = selectedNote?.group_id ?? defaultGroup?.id ?? "";

  const showGroupsPanel = !isMobile || mobilePanel === "groups";
  const showNotesPanel = !isMobile || mobilePanel === "notes";
  const showEditorPanel = !isMobile || mobilePanel === "editor";

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

      {/* Sidebar */}
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
          <span style={{ fontWeight: 700 }}>노트 에디터</span>
          <button
            type="button"
            style={styles.logoutBtn}
            onClick={handleLogout}
            title="로그아웃"
            aria-label="로그아웃"
          >
            나가기
          </button>
        </div>
        <div style={styles.userInfo}>{username}</div>

        {/* Group list */}
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
              onClick={() => selectGroup(null)}
              aria-pressed={selectedGroupId === null}
            >
              전체 노트
            </button>
          </div>
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                ...styles.groupRow,
                ...(selectedGroupId === g.id ? styles.activeGroup : {}),
              }}
            >
              <button
                type="button"
                style={styles.groupSelectButton}
                onClick={() => selectGroup(g.id)}
                aria-pressed={selectedGroupId === g.id}
              >
                {g.name}
              </button>
              {g.name !== DEFAULT_GROUP_NAME && (
                <div style={styles.groupActionButtons}>
                  <button
                    type="button"
                    style={styles.iconBtn}
                    onClick={() => { void handleRenameGroup(g.id, g.name); }}
                    title="그룹 이름 변경"
                    aria-label={`${g.name} 그룹 이름 변경`}
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    style={styles.iconBtn}
                    onClick={() => { void handleDeleteGroup(g.id, g.name); }}
                    title="그룹 삭제"
                    aria-label={`${g.name} 그룹 삭제`}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* New group form */}
        <form onSubmit={handleCreateGroup} style={styles.newGroupForm}>
          <input
            style={styles.groupInput}
            placeholder="새 그룹명..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            aria-label="새 그룹 이름"
          />
          <button style={styles.addBtn} type="submit" aria-label="그룹 추가">+</button>
        </form>
      </aside>
      )}

      {/* Note list */}
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
              {currentGroupLabel} ({notes.length})
            </span>
            <span style={styles.reorderHint}>{reorderLabel}</span>
          </div>
          <button
            type="button"
            style={styles.newNoteBtn}
            onClick={() => { void createNote(); }}
            aria-label="새 노트 만들기"
          >
            + 새 노트
          </button>
        </div>
        <div style={styles.noteListBody}>
          {notes.length === 0 && (
            <div style={styles.empty}>노트가 없습니다.</div>
          )}
          {notes.map((n, index) => {
            const canMoveUp = selectedGroupId === null && index > 0;
            const canMoveDown = selectedGroupId === null && index < notes.length - 1;

            return (
              <div
                key={n.id}
                style={{
                  ...styles.noteItem,
                  ...(selectedNote?.id === n.id ? styles.activeNote : {}),
                }}
              >
                <div style={styles.noteRow}>
                  <button
                    type="button"
                    style={styles.noteSelectButton}
                    onClick={() => selectNote(n)}
                    aria-pressed={selectedNote?.id === n.id}
                    aria-label={`${n.title || "제목 없음"} 노트 열기`}
                  >
                    <div style={styles.noteTitle}>{n.title || "(제목 없음)"}</div>
                    <div style={styles.noteDate}>
                      {new Date(n.updated_at).toLocaleDateString("ko-KR")}
                    </div>
                  </button>
                  <div style={styles.noteActions}>
                    {selectedGroupId === null && (
                      <>
                        <button
                          type="button"
                          style={styles.orderBtn}
                          onClick={() => {
                            void moveNote(n.id, -1);
                          }}
                          title="위로 이동"
                          aria-label={`${n.title || "제목 없음"} 노트를 위로 이동`}
                          disabled={!canMoveUp || reorderStatus === "saving"}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          style={styles.orderBtn}
                          onClick={() => {
                            void moveNote(n.id, 1);
                          }}
                          title="아래로 이동"
                          aria-label={`${n.title || "제목 없음"} 노트를 아래로 이동`}
                          disabled={!canMoveDown || reorderStatus === "saving"}
                        >
                          ↓
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      style={styles.deleteBtn}
                      onClick={() => {
                        void deleteNote(n.id);
                      }}
                      title="삭제"
                      aria-label={`${n.title || "제목 없음"} 노트 삭제`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Editor */}
      {showEditorPanel && (
      <div style={styles.editor}>
        {selectedNote ? (
          <>
            <div style={styles.editorToolbar}>
              <input
                style={styles.titleInput}
                placeholder="제목"
                value={title}
                onChange={handleTitleChange}
                maxLength={120}
                aria-label="노트 제목"
              />
              {groups.length > 0 && (
                <label style={styles.groupPicker}>
                  <span style={styles.groupPickerLabel}>그룹</span>
                  <select
                    style={styles.groupPickerSelect}
                    value={selectedNoteGroupValue}
                    onChange={(event) => {
                      void handleMoveSelectedNoteGroup(event.target.value);
                    }}
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
              <div style={styles.toolbarRight} aria-live="polite">
                <span
                  style={{
                    ...styles.statusBadge,
                    color:
                      saveStatus === "error" ? "var(--color-danger)" :
                      saveStatus === "dirty" || saveStatus === "saving"
                        ? "var(--color-text-secondary)"
                        : "var(--color-success)",
                  }}
                >
                  {saveLabel}
                </span>
                <span style={styles.charCount}>{charCount}자</span>
                <button
                  type="button"
                  style={{
                    ...styles.copyBtn,
                    background:
                      copyStatus === "success" ? "var(--color-success)" :
                      copyStatus === "error" ? "var(--color-danger)" :
                      "var(--color-primary)",
                  }}
                  onClick={handleCopy}
                  aria-label="현재 노트 전체 복사"
                >
                  {copyLabel}
                </button>
              </div>
            </div>
            <textarea
              style={styles.textarea}
              placeholder="내용을 입력하세요..."
              value={content}
              onChange={handleContentChange}
              maxLength={20000}
              aria-label="노트 본문"
            />
          </>
        ) : (
          <div style={styles.noNote}>노트를 선택하거나 새 노트를 만드세요.</div>
        )}
      </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
  mobileTabs: {
    display: "flex",
    gap: "8px",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
  },
  mobileTabButton: {
    flex: 1,
    minHeight: "44px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    background: "var(--color-bg)",
    fontWeight: 600,
  },
  mobileTabButtonActive: {
    background: "var(--color-primary)",
    color: "#fff",
    borderColor: "var(--color-primary)",
  },
  sidebar: {
    width: "180px",
    flexShrink: 0,
    background: "var(--color-surface)",
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "12px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutBtn: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: "2px 4px",
  },
  userInfo: {
    padding: "8px 12px",
    fontSize: "12px",
    color: "var(--color-text-secondary)",
    borderBottom: "1px solid var(--color-border)",
  },
  groupSection: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 0",
  },
  groupRow: {
    display: "flex",
    alignItems: "center",
    margin: "1px 4px",
    borderRadius: "4px",
  },
  activeGroup: {
    background: "var(--color-primary)",
    color: "#fff",
  },
  groupSelectButton: {
    flex: 1,
    minHeight: "44px",
    padding: "8px 12px",
    textAlign: "left",
    color: "inherit",
    fontSize: "13px",
  },
  iconBtn: {
    background: "none",
    color: "inherit",
    opacity: 0.7,
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "48px",
    minHeight: "44px",
  },
  groupActionButtons: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    paddingRight: "4px",
  },
  newGroupForm: {
    display: "flex",
    padding: "8px",
    borderTop: "1px solid var(--color-border)",
    gap: "4px",
  },
  groupInput: {
    flex: 1,
    padding: "4px 6px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontSize: "12px",
    outline: "none",
  },
  addBtn: {
    minWidth: "44px",
    minHeight: "44px",
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius)",
    cursor: "pointer",
    fontWeight: 700,
  },
  noteList: {
    width: "220px",
    flexShrink: 0,
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--color-bg)",
  },
  noteListHeader: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "var(--color-surface)",
  },
  noteListBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },
  noteListMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  reorderHint: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
  },
  newNoteBtn: {
    fontSize: "12px",
    minHeight: "44px",
    padding: "4px 12px",
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius)",
    cursor: "pointer",
  },
  empty: {
    padding: "20px 12px",
    color: "var(--color-text-secondary)",
    fontSize: "13px",
    textAlign: "center",
  },
  noteItem: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border)",
    cursor: "pointer",
    background: "var(--color-surface)",
  },
  noteRow: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: "8px",
  },
  noteSelectButton: {
    minWidth: 0,
    flex: 1,
    textAlign: "left",
    padding: "0",
    minHeight: "44px",
  },
  activeNote: {
    background: "#eff6ff",
    borderLeft: "3px solid var(--color-primary)",
  },
  noteTitle: {
    fontWeight: 500,
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  noteDate: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
    marginTop: "2px",
  },
  noteActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  },
  orderBtn: {
    background: "none",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    color: "var(--color-text-secondary)",
    fontSize: "12px",
    lineHeight: 1,
    minWidth: "44px",
    minHeight: "44px",
  },
  deleteBtn: {
    background: "none",
    border: "1px solid transparent",
    borderRadius: "var(--radius)",
    color: "var(--color-text-secondary)",
    fontSize: "16px",
    lineHeight: 1,
    minWidth: "44px",
    minHeight: "44px",
  },
  editor: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  editorToolbar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    padding: "8px 16px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    gap: "12px",
  },
  titleInput: {
    flex: 1,
    minWidth: "180px",
    border: "none",
    outline: "none",
    fontSize: "16px",
    fontWeight: 600,
    background: "transparent",
  },
  groupPicker: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  groupPickerLabel: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
  },
  groupPickerSelect: {
    minHeight: "36px",
    padding: "4px 8px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
    marginLeft: "auto",
  },
  statusBadge: {
    fontSize: "12px",
  },
  charCount: {
    fontSize: "12px",
    color: "var(--color-text-secondary)",
  },
  copyBtn: {
    minHeight: "44px",
    padding: "4px 12px",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius)",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
  },
  textarea: {
    flex: 1,
    padding: "16px",
    border: "none",
    outline: "none",
    resize: "none",
    fontSize: "14px",
    lineHeight: 1.7,
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
  },
  noNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "var(--color-text-secondary)",
    fontSize: "14px",
  },
};
