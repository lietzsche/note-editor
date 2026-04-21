# BACKLOG-003: Group and Note DnD Reorder

- Version: v1.0
- Date: 2026-04-16
- Status: Done
- Supersedes reorder policy in:
- `docs/backlog/BACKLOG-001-note-list-reorder-and-group-move.md`
- `docs/testing/backlog/TEST-BACKLOG-001-note-list-reorder-and-group-move.md`
- Related docs:
- `docs/features/FEATURE-003-groups.md`
- `docs/features/FEATURE-006-note-list-reorder-and-group-move.md`
- `docs/testing/backlog/TEST-BACKLOG-004-group-and-note-dnd-reorder.md`

## Summary

This backlog item introduced drag-and-drop reorder for both:

1. Sidebar group order
2. Note list order in `All notes` and group-filtered views

The implementation ships as a DnD-only reorder flow. The previous up/down note reorder buttons are removed.

## Implemented Scope

### Backend

1. Added `POST /api/groups/reorder`
2. Request body: `{"orderedGroupIds":["g2","g1","g3"]}`
3. Validation rules:
- full set of the signed-in user's group IDs is required
- duplicate IDs are rejected
- missing IDs are rejected
- foreign IDs are rejected
4. Group positions are rewritten to `0..n-1` in one batch
5. The default group participates in reorder but remains rename/delete protected

### Frontend

1. Added `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`
2. Added sortable group and note list components
3. Moved page rendering into a dedicated `NotesPageLayout` component while keeping cache and persistence logic in `NotesPage`
4. Added explicit drag handles so selection, delete, and group-move actions stay separate from drag start
5. Enabled mouse, touch, and keyboard DnD flows
6. Split reorder state into `groupReorderStatus` and `noteReorderStatus`
7. Preserved existing note cache merge behavior for group-scoped reorder

## Public Interface Changes

1. New API endpoint: `POST /api/groups/reorder`
2. New client method: `api.groups.reorder(orderedGroupIds: string[])`
3. Note reorder API remains `POST /api/notes/reorder`

## Verification

1. `npm run typecheck`
2. `npm run test:unit`
3. `npm run test:integration -- tests/api/auth.test.ts`

## Notes

1. Group reorder stays on the existing `groups.position` field.
2. Note reorder stays on the existing `pages.sort_order` field.
3. Group-scoped note reorder still affects the relative note order seen in `All notes`.
