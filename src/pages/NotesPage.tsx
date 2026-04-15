import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, type Group, type Note } from "../lib/api";
import { CharacterCountIndicator } from "../components/CharacterCountIndicator";
import { CopyAllButton } from "../components/CopyAllButton";
import { copyText, countGraphemes } from "../lib/editorProductivity";
import { cloneNotes, getNotesScopeKey, readCachedNotes } from "../lib/noteCache";
import { PerformanceDebugPanel } from "../components/PerformanceDebugPanel";
import {
  appendPerfSample,
  buildPerfConsoleLine,
  type PerfSample,
} from "../lib/performanceDebug";

type Props = {
  username: string;
  onLogout: () => void;
};

type SaveStatus = "saved" | "saving" | "error" | "dirty" | "conflict";
type MobilePanel = "groups" | "notes" | "editor";
type CopyStatus = "ready" | "copy-success" | "copy-error";
type CountStatus = "count-ready" | "count-stale";
type LoadState = "idle" | "loading" | "refreshing" | "ready" | "error";
type PendingAction =
  | { type: "select-note"; note: Note }
  | { type: "select-group"; groupId: string | null }
  | { type: "create-note" }
  | { type: "move-note-group"; groupId: string }
  | { type: "logout" };

const MOBILE_MEDIA_QUERY = "(max-width: 900px)";
const DEFAULT_GROUP_NAME = "미분류";
const ALL_NOTES_SCOPE_KEY = "__all__";
const PERF_DEBUG_ENABLED = import.meta.env.DEV;

type PendingGroupPerf = {
  groupId: string | null;
  label: string;
  startTime: number;
  source: "cold" | "warm";
};

export default function NotesPage({ username, onLogout }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("ready");
  const [countStatus, setCountStatus] = useState<CountStatus>("count-ready");
  const [notesLoadState, setNotesLoadState] = useState<LoadState>("idle");
  const [reorderStatus, setReorderStatus] = useState<"idle" | "saving" | "error">("idle");
  const [newGroupName, setNewGroupName] = useState("");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA_QUERY).matches
  );
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("notes");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [dialogMode, setDialogMode] = useState<"transition" | "conflict" | null>(null);
  const [conflictNote, setConflictNote] = useState<Note | null>(null);
  const [perfSamples, setPerfSamples] = useState<PerfSample[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedNoteIdRef = useRef<string | null>(null);
  const selectedNoteUpdatedAtRef = useRef<string | null>(null);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const pendingGroupPerfRef = useRef<PendingGroupPerf | null>(null);
  const groupsCacheRef = useRef<Group[] | null>(null);
  const notesCacheRef = useRef<Map<string, Note[]>>(new Map());
  const groupsInFlightRef = useRef<Promise<Group[]> | null>(null);
  const notesInFlightRef = useRef<Map<string, Promise<Note[]>>>(new Map());
  const notesRequestSequenceRef = useRef(0);
  const currentScopeKeyRef = useRef(ALL_NOTES_SCOPE_KEY);

  const loadGroups = useCallback(async (options?: { preferCache?: boolean }) => {
    const cached = options?.preferCache && groupsCacheRef.current
      ? cloneGroups(groupsCacheRef.current)
      : null;

    if (cached) {
      setGroups(cached);
    }

    try {
      let request = groupsInFlightRef.current;
      if (!request) {
        request = api.groups.list().finally(() => {
          groupsInFlightRef.current = null;
        });
        groupsInFlightRef.current = request;
      }

      const data = await request;
      const snapshot = cloneGroups(data);
      groupsCacheRef.current = snapshot;
      setGroups(snapshot);
      return snapshot;
    } catch (error) {
      if (!cached) throw error;
      return cached;
    }
  }, []);

  const loadNotes = useCallback(async (
    groupId?: string,
    options?: { preferCache?: boolean }
  ) => {
    const normalizedGroupId = groupId ?? null;
    const scopeKey = getNotesScopeKey(normalizedGroupId);
    const cached = options?.preferCache
      ? readCachedNotes(notesCacheRef.current, normalizedGroupId)
      : null;

    currentScopeKeyRef.current = scopeKey;

    if (cached) {
      startTransition(() => {
        setNotes(cached);
        setNotesLoadState("refreshing");
      });

      if (
        pendingGroupPerfRef.current &&
        pendingGroupPerfRef.current.groupId === normalizedGroupId
      ) {
        pendingGroupPerfRef.current.source = "warm";
      }
    } else {
      startTransition(() => {
        setNotesLoadState("loading");
      });

      if (
        pendingGroupPerfRef.current &&
        pendingGroupPerfRef.current.groupId === normalizedGroupId
      ) {
        pendingGroupPerfRef.current.source = "cold";
      }
    }

    const requestSequence = ++notesRequestSequenceRef.current;

    try {
      let request = notesInFlightRef.current.get(scopeKey);
      if (!request) {
        request = api.notes.list(groupId).finally(() => {
          notesInFlightRef.current.delete(scopeKey);
        });
        notesInFlightRef.current.set(scopeKey, request);
      }

      const data = await request;
      const snapshot = cloneNotes(data);
      notesCacheRef.current.set(scopeKey, snapshot);

      if (
        requestSequence === notesRequestSequenceRef.current &&
        currentScopeKeyRef.current === scopeKey
      ) {
        startTransition(() => {
          setNotes(snapshot);
          setNotesLoadState("ready");
        });
      }

      return snapshot;
    } catch (error) {
      if (
        requestSequence === notesRequestSequenceRef.current &&
        currentScopeKeyRef.current === scopeKey
      ) {
        startTransition(() => {
          setNotesLoadState(cached ? "ready" : "error");
        });
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    void loadGroups({ preferCache: true }).catch(() => {});
  }, [loadGroups]);

  useEffect(() => {
    void loadNotes(selectedGroupId ?? undefined, { preferCache: true }).catch(() => {});
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
    if (!PERF_DEBUG_ENABLED) return;

    const pending = pendingGroupPerfRef.current;
    if (!pending || pending.groupId !== selectedGroupId) return;

    afterNextPaint(() => {
      const current = pendingGroupPerfRef.current;
      if (!current || current.groupId !== selectedGroupId) return;

      pendingGroupPerfRef.current = null;
      recordPerfSample({
        id: `group-${selectedGroupId ?? "all"}-${Date.now()}`,
        kind: "group-switch",
        label: current.label,
        durationMs: performance.now() - current.startTime,
        summary: `${current.source === "warm" ? "캐시" : "네트워크"} · ${notes.length}개 노트 렌더`,
        measuredAt: new Date().toISOString(),
      });
    });
  }, [notes, selectedGroupId]);

  useEffect(() => {
    if (!isMobile) return;
    if (mobilePanel === "editor" && !selectedNote) {
      setMobilePanel("notes");
    }
  }, [isMobile, mobilePanel, selectedNote]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (countStatus !== "count-stale") return undefined;

    const timer = setTimeout(() => {
      setCountStatus("count-ready");
    }, 0);

    return () => clearTimeout(timer);
  }, [countStatus, selectedNote?.id, content]);

  function cancelScheduledSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  function afterNextPaint(callback: () => void) {
    if (typeof window === "undefined") {
      callback();
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(callback);
    });
  }

  function recordPerfSample(sample: PerfSample) {
    if (!PERF_DEBUG_ENABLED) return;

    setPerfSamples((prev) => appendPerfSample(prev, sample));
    console.info(buildPerfConsoleLine(sample));
  }

  function getGroupLabel(groupId: string | null) {
    if (groupId === null) return "전체 노트";
    return groups.find((group) => group.id === groupId)?.name ?? "그룹";
  }

  function setNotesForScope(groupId: string | null, nextNotes: Note[]) {
    const scopeKey = getNotesScopeKey(groupId);
    const snapshot = cloneNotes(nextNotes);
    notesCacheRef.current.set(scopeKey, snapshot);

    if (scopeKey === currentScopeKeyRef.current) {
      startTransition(() => {
        setNotes(snapshot);
        setNotesLoadState("ready");
      });
    }
  }

  function invalidateAllNotesCache() {
    notesCacheRef.current.clear();
    notesInFlightRef.current.clear();
    notesRequestSequenceRef.current += 1;
  }

  function upsertGroup(nextGroup: Group) {
    const current = groupsCacheRef.current ?? groups;
    const nextGroups = [
      ...current.filter((group) => group.id !== nextGroup.id),
      nextGroup,
    ].sort((a, b) => a.position - b.position);
    const snapshot = cloneGroups(nextGroups);
    groupsCacheRef.current = snapshot;
    setGroups(snapshot);
  }

  function removeGroup(groupId: string) {
    const current = groupsCacheRef.current ?? groups;
    const nextGroups = current.filter((group) => group.id !== groupId);
    const snapshot = cloneGroups(nextGroups);
    groupsCacheRef.current = snapshot;
    setGroups(snapshot);
  }

  function cloneGroups(nextGroups: Group[]) {
    return nextGroups.map((group) => ({ ...group }));
  }

  function sortNotesByOrder(nextNotes: Note[]) {
    return [...nextNotes].sort((a, b) => a.sort_order - b.sort_order);
  }

  function updateNoteAcrossCaches(nextNote: Note) {
    for (const [scopeKey, cachedNotes] of notesCacheRef.current.entries()) {
      if (!cachedNotes.some((note) => note.id === nextNote.id)) continue;

      const nextScopeNotes = cachedNotes.map((note) => (
        note.id === nextNote.id ? { ...nextNote } : note
      ));
      notesCacheRef.current.set(scopeKey, cloneNotes(nextScopeNotes));

      if (scopeKey === currentScopeKeyRef.current) {
        startTransition(() => {
          setNotes(nextScopeNotes);
        });
      }
    }
  }

  function removeNoteFromCaches(noteId: string) {
    for (const [scopeKey, cachedNotes] of notesCacheRef.current.entries()) {
      if (!cachedNotes.some((note) => note.id === noteId)) continue;

      const nextScopeNotes = cachedNotes.filter((note) => note.id !== noteId);
      notesCacheRef.current.set(scopeKey, cloneNotes(nextScopeNotes));

      if (scopeKey === currentScopeKeyRef.current) {
        startTransition(() => {
          setNotes(nextScopeNotes);
        });
      }
    }
  }

  function applyCreatedNoteToCaches(note: Note) {
    const allNotes = notesCacheRef.current.get(ALL_NOTES_SCOPE_KEY);
    if (allNotes) {
      notesCacheRef.current.set(
        ALL_NOTES_SCOPE_KEY,
        cloneNotes(sortNotesByOrder([...allNotes, note]))
      );
    }

    if (note.group_id !== null) {
      const groupNotes = notesCacheRef.current.get(note.group_id);
      if (groupNotes) {
        notesCacheRef.current.set(
          note.group_id,
          cloneNotes(sortNotesByOrder([...groupNotes, note]))
        );
      }
    }
  }

  function applyMovedNoteToCaches(nextNote: Note, previousGroupId: string | null) {
    removeNoteFromCaches(nextNote.id);

    const allNotes = notesCacheRef.current.get(ALL_NOTES_SCOPE_KEY);
    if (allNotes) {
      notesCacheRef.current.set(
        ALL_NOTES_SCOPE_KEY,
        cloneNotes(sortNotesByOrder([...allNotes, nextNote]))
      );
    }

    if (nextNote.group_id !== null) {
      const targetGroupNotes = notesCacheRef.current.get(nextNote.group_id);
      if (targetGroupNotes) {
        notesCacheRef.current.set(
          nextNote.group_id,
          cloneNotes(sortNotesByOrder([...targetGroupNotes, nextNote]))
        );
      }
    }

    if (previousGroupId && previousGroupId !== nextNote.group_id) {
      const sourceGroupNotes = notesCacheRef.current.get(previousGroupId);
      if (sourceGroupNotes) {
        notesCacheRef.current.set(
          previousGroupId,
          cloneNotes(sourceGroupNotes.filter((note) => note.id !== nextNote.id))
        );
      }
    }
  }

  function syncGroupCachesFromAllNotes(allNotes: Note[]) {
    notesCacheRef.current.set(ALL_NOTES_SCOPE_KEY, cloneNotes(allNotes));

    for (const scopeKey of notesCacheRef.current.keys()) {
      if (scopeKey === ALL_NOTES_SCOPE_KEY) continue;

      notesCacheRef.current.set(
        scopeKey,
        cloneNotes(allNotes.filter((note) => note.group_id === scopeKey))
      );
    }
  }

  function hasBlockingEdits() {
    return Boolean(
      selectedNote &&
      (saveStatus === "dirty" || saveStatus === "error" || saveStatus === "conflict")
    );
  }

  function openTransitionDialog(action: PendingAction) {
    cancelScheduledSave();
    setPendingAction(action);
    setDialogMode(saveStatus === "conflict" ? "conflict" : "transition");
  }

  function applyGroupSelection(groupId: string | null) {
    if (PERF_DEBUG_ENABLED) {
      pendingGroupPerfRef.current = {
        groupId,
        label: getGroupLabel(groupId),
        startTime: performance.now(),
        source: "cold",
      };
    }

    setSelectedGroupId(groupId);
    if (groupId !== null && selectedNote && selectedNote.group_id !== groupId) {
      clearSelectedNoteView();
      return;
    }
    if (isMobile) {
      setMobilePanel("notes");
    }
  }

  function selectGroup(groupId: string | null) {
    if (groupId === selectedGroupId) return;

    if (hasBlockingEdits() && groupId !== selectedGroupId) {
      openTransitionDialog({ type: "select-group", groupId });
      return;
    }
    applyGroupSelection(groupId);
  }

  function clearSelectedNoteView() {
    cancelScheduledSave();
    selectedNoteIdRef.current = null;
    selectedNoteUpdatedAtRef.current = null;
    setSelectedNote(null);
    titleRef.current = "";
    contentRef.current = "";
    setTitle("");
    setContent("");
    setSaveStatus("saved");
    setCopyStatus("ready");
    setCountStatus("count-ready");
    setConflictNote(null);
    setPendingAction(null);
    setDialogMode(null);
    if (isMobile) {
      setMobilePanel("notes");
    }
  }

  function openNote(note: Note) {
    const noteOpenStart = PERF_DEBUG_ENABLED ? performance.now() : 0;

    cancelScheduledSave();
    selectedNoteIdRef.current = note.id;
    selectedNoteUpdatedAtRef.current = note.updated_at;
    titleRef.current = note.title;
    contentRef.current = note.content;
    startTransition(() => {
      setSelectedNote(note);
      setTitle(note.title);
      setContent(note.content);
      setSaveStatus("saved");
      setCopyStatus("ready");
      setCountStatus("count-stale");
      setConflictNote(null);
      setPendingAction(null);
      setDialogMode(null);
      if (isMobile) {
        setMobilePanel("editor");
      }
    });

    if (PERF_DEBUG_ENABLED) {
      const noteId = note.id;
      const titleLabel = note.title || "(제목 없음)";
      const contentLength = note.content.length;

      afterNextPaint(() => {
        if (selectedNoteIdRef.current !== noteId) return;

        recordPerfSample({
          id: `note-${noteId}-${Date.now()}`,
          kind: "note-open",
          label: titleLabel,
          durationMs: performance.now() - noteOpenStart,
          summary: `본문 ${contentLength}자 렌더`,
          measuredAt: new Date().toISOString(),
        });
      });
    }
  }

  function selectNote(note: Note) {
    if (note.id === selectedNote?.id) return;

    if (hasBlockingEdits() && note.id !== selectedNote?.id) {
      openTransitionDialog({ type: "select-note", note });
      return;
    }
    openNote(note);
  }

  async function executePendingAction(action: PendingAction) {
    if (action.type === "select-note") {
      openNote(action.note);
      return;
    }

    if (action.type === "select-group") {
      applyGroupSelection(action.groupId);
      return;
    }

    if (action.type === "create-note") {
      await createNoteImmediately();
      return;
    }

    if (action.type === "move-note-group") {
      await moveSelectedNoteGroupImmediately(action.groupId);
      return;
    }

    await logoutImmediately();
  }

  useEffect(() => {
    if (!selectedNote || selectedGroupId === null) return;

    const noteStillVisible = notes.some((note) => note.id === selectedNote.id);
    if (!noteStillVisible) {
      clearSelectedNoteView();
    }
  }, [notes, selectedGroupId, selectedNote, isMobile]);

  async function createNoteImmediately() {
    const note = await api.notes.create({
      title: "새 노트",
      group_id: selectedGroupId ?? undefined,
    });
    applyCreatedNoteToCaches(note);
    setNotesForScope(selectedGroupId, sortNotesByOrder([...notes, note]));
    openNote(note);
  }

  async function createNote() {
    if (hasBlockingEdits()) {
      openTransitionDialog({ type: "create-note" });
      return;
    }
    await createNoteImmediately();
  }

  async function deleteNote(id: string) {
    if (!window.confirm("노트를 삭제할까요?")) return;
    await api.notes.delete(id);
    const nextNotes = notes.filter((note) => note.id !== id);
    removeNoteFromCaches(id);
    setNotesForScope(selectedGroupId, nextNotes);
    if (selectedNote?.id === id) {
      clearSelectedNoteView();
    }
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
      syncGroupCachesFromAllNotes(reorderedNotes);
      setNotesForScope(null, reorderedNotes);
      setReorderStatus("idle");
    } catch {
      setNotes(previousNotes);
      setReorderStatus("error");
      setTimeout(() => setReorderStatus("idle"), 2000);
    }
  }

  function isConflictNoteData(data: unknown): data is Note {
    if (typeof data !== "object" || data === null) return false;

    return (
      "id" in data &&
      "title" in data &&
      "content" in data &&
      "group_id" in data &&
      "sort_order" in data &&
      "updated_at" in data
    );
  }

  async function persistCurrentNote(force = false) {
    if (!selectedNote) return true;

    cancelScheduledSave();
    const noteId = selectedNote.id;
    const draftTitle = titleRef.current;
    const draftContent = contentRef.current;
    const expectedUpdatedAt = force
      ? conflictNote?.updated_at ?? selectedNoteUpdatedAtRef.current
      : selectedNoteUpdatedAtRef.current;

    setSaveStatus("saving");

    try {
      const updated = await api.notes.update(noteId, {
        title: draftTitle,
        content: draftContent,
        updated_at: expectedUpdatedAt ?? undefined,
        force,
      });

      setNotes((prev) => {
        const nextNotes = prev.map((note) => (note.id === noteId ? updated : note));
        notesCacheRef.current.set(currentScopeKeyRef.current, cloneNotes(nextNotes));
        return nextNotes;
      });
      updateNoteAcrossCaches(updated);

      if (selectedNoteIdRef.current !== noteId) {
        return true;
      }

      selectedNoteUpdatedAtRef.current = updated.updated_at;
      setSelectedNote(updated);
      setConflictNote(null);

      const draftStillCurrent =
        titleRef.current === draftTitle && contentRef.current === draftContent;
      setSaveStatus(draftStillCurrent ? "saved" : "dirty");
      return true;
    } catch (error) {
      if (selectedNoteIdRef.current !== noteId) {
        return false;
      }

      if (
        error instanceof ApiError &&
        error.code === "CONFLICT" &&
        isConflictNoteData(error.data)
      ) {
        updateNoteAcrossCaches(error.data);
        setNotes((prev) => prev.map((note) => (note.id === noteId ? error.data : note)));
        setSelectedNote(error.data);
        selectedNoteUpdatedAtRef.current = error.data.updated_at;
        setConflictNote(error.data);
        setSaveStatus("conflict");
        setDialogMode("conflict");
        return false;
      }

      setSaveStatus("error");
      return false;
    }
  }

  function scheduleAutoSave(noteId: string) {
    cancelScheduledSave();
    setSaveStatus("dirty");
    saveTimerRef.current = setTimeout(async () => {
      if (selectedNoteIdRef.current !== noteId) return;
      await persistCurrentNote();
    }, 800);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTitle(v);
    titleRef.current = v;
    setCountStatus("count-ready");
    if (selectedNote && saveStatus !== "conflict") scheduleAutoSave(selectedNote.id);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setContent(v);
    contentRef.current = v;
    setCountStatus("count-ready");
    if (selectedNote && saveStatus !== "conflict") scheduleAutoSave(selectedNote.id);
  }

  async function handleCopy() {
    const result = await copyText(
      typeof navigator !== "undefined" ? navigator.clipboard : null,
      content
    );

    setCopyStatus(result === "success" ? "copy-success" : "copy-error");
    setTimeout(() => setCopyStatus("ready"), 2000);
  }

  async function logoutImmediately() {
    await api.auth.logout();
    onLogout();
  }

  async function handleLogout() {
    if (hasBlockingEdits()) {
      openTransitionDialog({ type: "logout" });
      return;
    }
    await logoutImmediately();
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const createdGroup = await api.groups.create(newGroupName.trim());
      setNewGroupName("");
      upsertGroup(createdGroup);
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
      const updatedGroup = await api.groups.update(id, normalizedName);
      upsertGroup(updatedGroup);
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
      removeGroup(id);
      invalidateAllNotesCache();
      if (wasSelectedGroup) setSelectedGroupId(null);

      if (!wasSelectedGroup) {
        await loadNotes(selectedGroupId ?? undefined, { preferCache: true });
      }

      if (selectedNoteWasInGroup && selectedNote) {
        const refreshedNote = await api.notes.get(selectedNote.id);
        openNote(refreshedNote);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "그룹 삭제에 실패했습니다.");
    }
  }

  async function moveSelectedNoteGroupImmediately(groupId: string) {
    if (!selectedNote) return;
    if (groupId === selectedNote.group_id) return;

    try {
      const previousGroupId = selectedNote.group_id;
      const updatedNote = await api.notes.moveGroup(selectedNote.id, groupId || null);
      applyMovedNoteToCaches(updatedNote, previousGroupId);

      if (selectedGroupId !== null && updatedNote.group_id !== selectedGroupId) {
        setNotesForScope(
          selectedGroupId,
          notes.filter((note) => note.id !== selectedNote.id)
        );
        clearSelectedNoteView();
      } else {
        setNotesForScope(
          selectedGroupId,
          notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
        );
        openNote(updatedNote);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "노트 그룹 이동에 실패했습니다.");
    }
  }

  async function handleMoveSelectedNoteGroup(groupId: string) {
    if (hasBlockingEdits()) {
      openTransitionDialog({ type: "move-note-group", groupId });
      return;
    }

    await moveSelectedNoteGroupImmediately(groupId);
  }

  async function handleDialogPrimaryAction() {
    const saved = await persistCurrentNote(dialogMode === "conflict");
    if (!saved) return;

    const action = pendingAction;
    setPendingAction(null);
    setDialogMode(null);

    if (action) {
      await executePendingAction(action);
    }
  }

  async function handleDialogDiscardAction() {
    const action = pendingAction;
    cancelScheduledSave();
    setPendingAction(null);
    setDialogMode(null);
    setConflictNote(null);
    setSaveStatus("saved");
    setCopyStatus("ready");

    if (action) {
      await executePendingAction(action);
    }
  }

  function handleDialogCancelAction() {
    setPendingAction(null);
    setDialogMode(null);
  }

  async function handleRetrySave() {
    await persistCurrentNote(saveStatus === "conflict");
  }

  const charCount = countGraphemes(content);

  const saveLabel =
    saveStatus === "saving" ? "저장 중..." :
    saveStatus === "dirty" ? "미저장" :
    saveStatus === "conflict" ? "충돌 발생" :
    saveStatus === "error" ? "저장 실패" : "저장됨";

  const noteListStatusLabel =
    reorderStatus === "saving" ? "정렬 저장 중..." :
    reorderStatus === "error" ? "정렬 실패" :
    notesLoadState === "loading" ? "노트 불러오는 중..." :
    notesLoadState === "refreshing" ? "목록 백그라운드 갱신 중..." :
    notesLoadState === "error" ? "목록 갱신 실패" :
    selectedGroupId === null ? "정렬 가능" : "전체 노트에서 정렬";

  const currentGroupLabel = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId)?.name ?? "그룹"
    : "전체 노트";
  const defaultGroup = groups.find((group) => group.name === DEFAULT_GROUP_NAME) ?? null;
  const selectedNoteGroupValue = selectedNote?.group_id ?? defaultGroup?.id ?? "";

  const showGroupsPanel = !isMobile || mobilePanel === "groups";
  const showNotesPanel = !isMobile || mobilePanel === "notes";
  const showEditorPanel = !isMobile || mobilePanel === "editor";
  const isConflictDialog = dialogMode === "conflict";
  const primaryDialogLabel =
    isConflictDialog
      ? pendingAction ? "덮어쓰기 후 이동" : "덮어쓰기"
      : saveStatus === "error" ? "다시 저장 후 이동" : "저장 후 이동";
  const dialogTitle =
    isConflictDialog ? "저장 충돌이 발생했습니다." : "미저장 변경이 있습니다.";
  const dialogDescription =
    isConflictDialog
      ? "다른 세션에서 먼저 저장되었습니다. 최신 서버 내용을 확인한 뒤 덮어쓸지 결정하세요."
      : saveStatus === "error"
        ? "마지막 입력값은 유지되어 있습니다. 다시 저장하거나 버리고 이동할 수 있습니다."
        : "현재 편집 중인 내용을 저장한 뒤 이동할지, 버리고 이동할지 선택하세요.";

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
            <span style={styles.reorderHint}>{noteListStatusLabel}</span>
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
          {notesLoadState === "loading" && notes.length === 0 && (
            <div style={styles.empty}>노트를 불러오는 중입니다.</div>
          )}
          {notesLoadState === "error" && notes.length === 0 && (
            <div style={styles.empty}>노트를 불러오지 못했습니다.</div>
          )}
          {notesLoadState !== "loading" && notesLoadState !== "error" && notes.length === 0 && (
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
                    onClick={() => { void handleRetrySave(); }}
                    aria-label="저장 다시 시도"
                  >
                    다시 저장
                  </button>
                )}
                {saveStatus === "conflict" && (
                  <button
                    type="button"
                    style={styles.secondaryActionBtn}
                    onClick={() => setDialogMode("conflict")}
                    aria-label="저장 충돌 해결"
                  >
                    충돌 해결
                  </button>
                )}
                <CopyAllButton
                  onCopy={() => { void handleCopy(); }}
                  state={copyStatus}
                />
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
      {dialogMode && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="editor-dialog-title">
          <div style={styles.modalCard}>
            <h2 id="editor-dialog-title" style={styles.modalTitle}>{dialogTitle}</h2>
            <p style={styles.modalDescription}>{dialogDescription}</p>
            {isConflictDialog && conflictNote && (
              <div style={styles.conflictGrid}>
                <section style={styles.conflictPanel}>
                  <strong style={styles.conflictPanelTitle}>로컬 수정본</strong>
                  <div style={styles.conflictPanelBody}>
                    {content || "(빈 본문)"}
                  </div>
                </section>
                <section style={styles.conflictPanel}>
                  <strong style={styles.conflictPanelTitle}>서버 최신본</strong>
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
                onClick={() => { void handleDialogPrimaryAction(); }}
              >
                {primaryDialogLabel}
              </button>
              {pendingAction && (
                <button
                  type="button"
                  style={styles.modalSecondaryButton}
                  onClick={() => { void handleDialogDiscardAction(); }}
                >
                  버리고 이동
                </button>
              )}
              <button
                type="button"
                style={styles.modalGhostButton}
                onClick={handleDialogCancelAction}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      {PERF_DEBUG_ENABLED && perfSamples.length > 0 && (
        <PerformanceDebugPanel samples={perfSamples} />
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
    minHeight: 0,
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
    flexShrink: 0,
    display: "flex",
    padding: "8px",
    borderTop: "1px solid var(--color-border)",
    gap: "4px",
  },
  groupInput: {
    flex: 1,
    minWidth: 0,
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
  secondaryActionBtn: {
    minHeight: "36px",
    padding: "4px 10px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontSize: "12px",
    fontWeight: 600,
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
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.44)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    zIndex: 1000,
  },
  modalCard: {
    width: "min(720px, 100%)",
    background: "var(--color-surface)",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--color-text-primary)",
  },
  modalDescription: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: "var(--color-text-secondary)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },
  modalPrimaryButton: {
    minHeight: "44px",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "none",
    background: "var(--color-primary)",
    color: "#fff",
    fontWeight: 700,
  },
  modalSecondaryButton: {
    minHeight: "44px",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "1px solid var(--color-border)",
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
    fontWeight: 600,
  },
  modalGhostButton: {
    minHeight: "44px",
    padding: "10px 14px",
    borderRadius: "var(--radius)",
    border: "1px solid transparent",
    background: "transparent",
    color: "var(--color-text-secondary)",
    fontWeight: 600,
  },
  conflictGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
  },
  conflictPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    borderRadius: "12px",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
  },
  conflictPanelTitle: {
    fontSize: "13px",
    color: "var(--color-text-primary)",
  },
  conflictPanelMeta: {
    fontSize: "12px",
    color: "var(--color-text-secondary)",
  },
  conflictPanelBody: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: "220px",
    overflowY: "auto",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "var(--color-text-primary)",
  },
};
