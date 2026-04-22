import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { api, type Group, type Note } from "../lib/api";
import { cloneNotes, readCachedNotes } from "../lib/noteCache";
import {
  applyCreatedNoteToCache,
  applyMovedNoteToCache,
  removeNoteFromCache,
  syncGroupCachesFromAllNotes as buildGroupCachesFromAllNotes,
  updateNoteAcrossCache,
} from "../lib/noteCacheMutations";
import {
  cloneGroups,
  removeGroupFromList,
  upsertGroupInList,
} from "../lib/noteCollections";
import { mergeGroupOrderIntoAllNotes } from "../lib/noteOrder";
import {
  buildLoadNotesStartState,
  buildSetNotesForScopeCache,
  getLoadNotesErrorState,
  invalidateNotesRequestState,
  shouldApplyLoadedNotes,
  ALL_NOTES_SCOPE_KEY,
} from "../lib/noteRequestState";
import type { LoadState } from "./notesPageDerivations";

type PendingGroupPerfRef = React.MutableRefObject<{
  groupId: string | null;
  label: string;
  startTime: number;
  source: "cold" | "warm";
} | null>;

type UseNotesDataArgs = {
  selectedGroupId: string | null;
  pendingGroupPerfRef: PendingGroupPerfRef;
};

export function useNotesData({
  selectedGroupId,
  pendingGroupPerfRef,
}: UseNotesDataArgs) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoadState, setNotesLoadState] = useState<LoadState>("idle");
  const [groupReorderStatus, setGroupReorderStatus] = useState<"idle" | "saving" | "error">("idle");
  const [noteReorderStatus, setNoteReorderStatus] = useState<"idle" | "saving" | "error">("idle");

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
    const startState = buildLoadNotesStartState({
      cache: notesCacheRef.current,
      groupId,
      preferCache: options?.preferCache,
    });
    const { normalizedGroupId, scopeKey, cached } = startState;

    currentScopeKeyRef.current = scopeKey;

    if (cached) {
      startTransition(() => {
        setNotes(cached);
        setNotesLoadState(startState.loadState);
      });
    } else {
      startTransition(() => {
        setNotesLoadState(startState.loadState);
      });
    }

    if (
      pendingGroupPerfRef.current &&
      pendingGroupPerfRef.current.groupId === normalizedGroupId
    ) {
      pendingGroupPerfRef.current.source = startState.perfSource;
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

      if (shouldApplyLoadedNotes({
        requestSequence,
        latestRequestSequence: notesRequestSequenceRef.current,
        currentScopeKey: currentScopeKeyRef.current,
        scopeKey,
      })) {
        startTransition(() => {
          setNotes(snapshot);
          setNotesLoadState("ready");
        });
      }

      return snapshot;
    } catch (error) {
      const nextErrorState = getLoadNotesErrorState({
        shouldApply: shouldApplyLoadedNotes({
          requestSequence,
          latestRequestSequence: notesRequestSequenceRef.current,
          currentScopeKey: currentScopeKeyRef.current,
          scopeKey,
        }),
        hasCachedNotes: Boolean(cached),
      });
      if (nextErrorState) {
        startTransition(() => {
          setNotesLoadState(nextErrorState);
        });
      }
      throw error;
    }
  }, [pendingGroupPerfRef]);

  useEffect(() => {
    void loadGroups({ preferCache: true }).catch(() => {});
  }, [loadGroups]);

  useEffect(() => {
    void loadNotes(selectedGroupId ?? undefined, { preferCache: true }).catch(() => {});
  }, [selectedGroupId, loadNotes]);

  const setNotesForScope = useCallback((groupId: string | null, nextNotes: Note[]) => {
    const nextState = buildSetNotesForScopeCache(notesCacheRef.current, groupId, nextNotes);
    notesCacheRef.current = nextState.cache;

    if (nextState.scopeKey === currentScopeKeyRef.current) {
      startTransition(() => {
        setNotes(nextState.snapshot);
        setNotesLoadState("ready");
      });
    }
  }, []);

  const invalidateAllNotesCache = useCallback(() => {
    const nextState = invalidateNotesRequestState(notesRequestSequenceRef.current);
    notesCacheRef.current = nextState.cache;
    notesInFlightRef.current = nextState.inFlight;
    notesRequestSequenceRef.current = nextState.requestSequence;
  }, []);

  const setGroupsSnapshot = useCallback((nextGroups: Group[]) => {
    const snapshot = cloneGroups(nextGroups);
    groupsCacheRef.current = snapshot;
    setGroups(snapshot);
  }, []);

  const upsertGroup = useCallback((nextGroup: Group) => {
    const current = groupsCacheRef.current ?? groups;
    setGroupsSnapshot(upsertGroupInList(current, nextGroup));
  }, [groups, setGroupsSnapshot]);

  const removeGroup = useCallback((groupId: string) => {
    const current = groupsCacheRef.current ?? groups;
    setGroupsSnapshot(removeGroupFromList(current, groupId));
  }, [groups, setGroupsSnapshot]);

  const updateNoteAcrossCaches = useCallback((nextNote: Note) => {
    notesCacheRef.current = updateNoteAcrossCache(notesCacheRef.current, nextNote);

    const currentNotes = notesCacheRef.current.get(currentScopeKeyRef.current);
    if (currentNotes) {
      startTransition(() => {
        setNotes(cloneNotes(currentNotes));
      });
    }
  }, []);

  const removeNoteFromCaches = useCallback((noteId: string) => {
    notesCacheRef.current = removeNoteFromCache(notesCacheRef.current, noteId);

    const currentNotes = notesCacheRef.current.get(currentScopeKeyRef.current);
    if (currentNotes) {
      startTransition(() => {
        setNotes(cloneNotes(currentNotes));
      });
    }
  }, []);

  const applyCreatedNoteToCaches = useCallback((note: Note) => {
    notesCacheRef.current = applyCreatedNoteToCache(notesCacheRef.current, note);
  }, []);

  const applyMovedNoteToCaches = useCallback((nextNote: Note, previousGroupId: string | null) => {
    notesCacheRef.current = applyMovedNoteToCache(
      notesCacheRef.current,
      nextNote,
      previousGroupId
    );
  }, []);

  const syncGroupCachesFromAllNotes = useCallback((allNotes: Note[]) => {
    notesCacheRef.current = buildGroupCachesFromAllNotes(notesCacheRef.current, allNotes);
  }, []);

  const handleGroupReorder = useCallback(async (nextGroups: Group[]) => {
    if (groupReorderStatus === "saving") return;

    const normalizedNextGroups = nextGroups.map((group, index) => ({
      ...group,
      position: index,
    }));
    const previousGroups = cloneGroups(groupsCacheRef.current ?? groups);
    setGroupsSnapshot(normalizedNextGroups);
    setGroupReorderStatus("saving");

    try {
      await api.groups.reorder(normalizedNextGroups.map((group) => group.id));
      setGroupReorderStatus("idle");
    } catch {
      setGroupsSnapshot(previousGroups);
      setGroupReorderStatus("error");
      setTimeout(() => setGroupReorderStatus("idle"), 2000);
    }
  }, [groupReorderStatus, groups, setGroupsSnapshot]);

  const handleNoteReorder = useCallback(async (reorderedNotes: Note[]) => {
    if (noteReorderStatus === "saving") return;

    const previousNotes = notes;
    setNotes(reorderedNotes);
    setNoteReorderStatus("saving");

    try {
      const scope = selectedGroupId
        ? { type: "group" as const, group_id: selectedGroupId }
        : undefined;

      await api.notes.reorder(
        reorderedNotes.map((note) => note.id),
        scope
      );

      if (selectedGroupId === null) {
        syncGroupCachesFromAllNotes(reorderedNotes);
        setNotesForScope(null, reorderedNotes);
      } else {
        const allNotes = readCachedNotes(notesCacheRef.current, null);

        if (allNotes) {
          const nextAllNotes = mergeGroupOrderIntoAllNotes(
            allNotes,
            selectedGroupId,
            reorderedNotes
          );
          syncGroupCachesFromAllNotes(nextAllNotes);
        }

        setNotesForScope(selectedGroupId, reorderedNotes);
      }

      setNoteReorderStatus("idle");
    } catch {
      setNotes(previousNotes);
      setNoteReorderStatus("error");
      setTimeout(() => setNoteReorderStatus("idle"), 2000);
    }
  }, [
    noteReorderStatus,
    notes,
    selectedGroupId,
    setNotesForScope,
    syncGroupCachesFromAllNotes,
  ]);

  return {
    groups,
    notes,
    setNotes,
    notesLoadState,
    groupReorderStatus,
    noteReorderStatus,
    groupsCacheRef,
    notesCacheRef,
    currentScopeKeyRef,
    loadGroups,
    loadNotes,
    setNotesForScope,
    invalidateAllNotesCache,
    upsertGroup,
    removeGroup,
    setGroupsSnapshot,
    updateNoteAcrossCaches,
    removeNoteFromCaches,
    applyCreatedNoteToCaches,
    applyMovedNoteToCaches,
    syncGroupCachesFromAllNotes,
    handleGroupReorder,
    handleNoteReorder,
  };
}
