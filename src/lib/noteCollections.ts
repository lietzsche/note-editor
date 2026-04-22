import type { Group, Note } from "./api";

export function cloneGroups(groups: Group[]) {
  return groups.map((group) => ({ ...group }));
}

export function upsertGroupInList(groups: Group[], nextGroup: Group) {
  return cloneGroups([
    ...groups.filter((group) => group.id !== nextGroup.id),
    nextGroup,
  ]).sort((a, b) => a.position - b.position);
}

export function removeGroupFromList(groups: Group[], groupId: string) {
  return cloneGroups(
    groups
      .filter((group) => group.id !== groupId)
      .map((group, index) => ({ ...group, position: index }))
  );
}

export function sortNotesByOrder(notes: Note[]) {
  return [...notes].sort((a, b) => a.sort_order - b.sort_order);
}
