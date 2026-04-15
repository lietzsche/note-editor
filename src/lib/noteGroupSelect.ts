export function getNoteGroupSelectValue(
  groupId: string | null,
  defaultGroupId: string | null
) {
  return groupId ?? defaultGroupId ?? "";
}

export function getNoteGroupIdFromSelectValue(
  value: string,
  defaultGroupId: string | null
) {
  if (!value) return null;
  return defaultGroupId && value === defaultGroupId ? null : value;
}
