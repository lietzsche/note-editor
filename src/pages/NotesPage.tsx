import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Group, type Note } from "../lib/api";

type Props = {
  username: string;
  onLogout: () => void;
};

type SaveStatus = "saved" | "saving" | "error" | "dirty";

export default function NotesPage({ username, onLogout }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [newGroupName, setNewGroupName] = useState("");
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

  function selectNote(note: Note) {
    selectedNoteIdRef.current = note.id;
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSaveStatus("saved");
    setCopyStatus("idle");
  }

  async function createNote() {
    const note = await api.notes.create({ group_id: selectedGroupId ?? undefined });
    await loadNotes(selectedGroupId ?? undefined);
    selectNote(note);
  }

  async function deleteNote(id: string) {
    if (!window.confirm("노트를 삭제할까요?")) return;
    await api.notes.delete(id);
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setTitle("");
      setContent("");
    }
    await loadNotes(selectedGroupId ?? undefined);
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
    await api.groups.create(newGroupName.trim());
    setNewGroupName("");
    await loadGroups();
  }

  async function handleDeleteGroup(id: string, name: string) {
    if (!window.confirm(`"${name}" 그룹을 삭제할까요? 소속 노트는 미분류로 이동됩니다.`)) return;
    await api.groups.delete(id);
    if (selectedGroupId === id) setSelectedGroupId(null);
    await loadGroups();
    await loadNotes(selectedGroupId ?? undefined);
  }

  const charCount = [...new Intl.Segmenter().segment(content)].length;

  const saveLabel =
    saveStatus === "saving" ? "저장 중..." :
    saveStatus === "dirty" ? "미저장" :
    saveStatus === "error" ? "저장 실패" : "저장됨";

  const copyLabel =
    copyStatus === "success" ? "복사됨!" :
    copyStatus === "error" ? "복사 실패" : "전체 복사";

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={{ fontWeight: 700 }}>노트 에디터</span>
          <button style={styles.logoutBtn} onClick={handleLogout} title="로그아웃">
            나가기
          </button>
        </div>
        <div style={styles.userInfo}>{username}</div>

        {/* Group list */}
        <div style={styles.groupSection}>
          <div
            style={{
              ...styles.groupItem,
              ...(selectedGroupId === null ? styles.activeGroup : {}),
            }}
            onClick={() => setSelectedGroupId(null)}
          >
            전체 노트
          </div>
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                ...styles.groupItem,
                ...(selectedGroupId === g.id ? styles.activeGroup : {}),
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => setSelectedGroupId(g.id)}
              >
                {g.name}
              </span>
              {g.name !== "미분류" && (
                <button
                  style={styles.iconBtn}
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id, g.name); }}
                  title="그룹 삭제"
                >
                  ×
                </button>
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
          />
          <button style={styles.addBtn} type="submit">+</button>
        </form>
      </aside>

      {/* Note list */}
      <div style={styles.noteList}>
        <div style={styles.noteListHeader}>
          <span style={{ fontWeight: 600 }}>
            {selectedGroupId
              ? groups.find((g) => g.id === selectedGroupId)?.name ?? "그룹"
              : "전체 노트"}
            {" "}({notes.length})
          </span>
          <button style={styles.newNoteBtn} onClick={createNote}>
            + 새 노트
          </button>
        </div>
        {notes.length === 0 && (
          <div style={styles.empty}>노트가 없습니다.</div>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            style={{
              ...styles.noteItem,
              ...(selectedNote?.id === n.id ? styles.activeNote : {}),
            }}
            onClick={() => selectNote(n)}
          >
            <div style={styles.noteTitle}>{n.title || "(제목 없음)"}</div>
            <div style={styles.noteDate}>
              {new Date(n.updated_at).toLocaleDateString("ko-KR")}
            </div>
            <button
              style={styles.deleteBtn}
              onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={styles.editor}>
        {selectedNote ? (
          <>
            <div style={styles.editorToolbar}>
              <input
                style={styles.titleInput}
                placeholder="제목"
                value={title}
                onChange={handleTitleChange}
              />
              <div style={styles.toolbarRight}>
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
                  style={{
                    ...styles.copyBtn,
                    background:
                      copyStatus === "success" ? "var(--color-success)" :
                      copyStatus === "error" ? "var(--color-danger)" :
                      "var(--color-primary)",
                  }}
                  onClick={handleCopy}
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
            />
          </>
        ) : (
          <div style={styles.noNote}>노트를 선택하거나 새 노트를 만드세요.</div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
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
  groupItem: {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "13px",
    borderRadius: "4px",
    margin: "1px 4px",
  },
  activeGroup: {
    background: "var(--color-primary)",
    color: "#fff",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "inherit",
    opacity: 0.5,
    fontSize: "14px",
    lineHeight: 1,
    padding: "0 2px",
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
    padding: "4px 8px",
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
  newNoteBtn: {
    fontSize: "12px",
    padding: "4px 8px",
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
    position: "relative",
    background: "var(--color-surface)",
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
    paddingRight: "20px",
  },
  noteDate: {
    fontSize: "11px",
    color: "var(--color-text-secondary)",
    marginTop: "2px",
  },
  deleteBtn: {
    position: "absolute",
    right: "8px",
    top: "8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--color-text-secondary)",
    fontSize: "16px",
    opacity: 0,
    transition: "opacity 0.1s",
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
    padding: "8px 16px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    gap: "12px",
  },
  titleInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "16px",
    fontWeight: 600,
    background: "transparent",
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  statusBadge: {
    fontSize: "12px",
  },
  charCount: {
    fontSize: "12px",
    color: "var(--color-text-secondary)",
  },
  copyBtn: {
    padding: "4px 10px",
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
