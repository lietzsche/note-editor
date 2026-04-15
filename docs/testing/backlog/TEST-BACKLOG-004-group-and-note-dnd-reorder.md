# TEST-BACKLOG-004: Group and Note DnD Reorder

- Related backlog: `docs/backlog/BACKLOG-003-group-and-note-dnd-reorder.md`
- Status: Ready for QA
- Supersedes historical reorder QA in:
- `docs/testing/backlog/TEST-BACKLOG-001-note-list-reorder-and-group-move.md`

## Automated Coverage

1. Unit
- existing note reorder helper coverage remains in `tests/note-order.test.ts`
2. Integration
- `tests/api/auth.test.ts`
- group reorder success
- relogin persistence after group reorder
- duplicate group ID rejection
- missing group rejection
- foreign group ID rejection
- existing note reorder coverage still passes for all-notes and group scope

## Manual Regression Scenarios

1. Desktop mouse drag: reorder groups in the sidebar and refresh the page
2. Desktop mouse drag: reorder notes in `All notes` and refresh the page
3. Desktop mouse drag: reorder notes inside a group view, then switch back to `All notes`
4. Mobile touch drag: reorder groups
5. Mobile touch drag: reorder notes
6. Keyboard drag-handle flow: reorder groups using the handle only
7. Keyboard drag-handle flow: reorder notes using the handle only
8. Same-position drop: no visual regression and no persisted order change
9. Failed persist rollback: simulate API failure and confirm optimistic UI rolls back
10. Tap-vs-drag separation on mobile: tapping opens/selects, dragging only starts from the handle

## Acceptance

1. Group order persists after reload and relogin
2. Note order persists after reload and relogin
3. Group-filtered note reorder is reflected in `All notes`
4. Default group remains rename/delete protected
5. No up/down reorder button remains in the note list UI
