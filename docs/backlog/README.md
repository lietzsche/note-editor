# Backlog Index

## Current Note (2026-04-16)

For reorder-related work, use `BACKLOG-003-group-and-note-dnd-reorder.md` as the
current canonical implementation doc. `BACKLOG-001-note-list-reorder-and-group-move.md`
remains as a historical baseline record and should not be used for current reorder policy.

현재 릴리스 범위 밖의 후속 업무를 관리한다.

## 운영 원칙

1. `docs/WBS.md`에는 현재 확정 범위만 둔다.
2. 후속 검토/개선/확장 항목은 `docs/backlog/*.md`에 누적한다.
3. backlog 항목이 구현 범위로 승격되면 PRD/WBS/TEST_PLAN에 반영한다.
4. backlog 항목별 테스트 초안은 `docs/testing/backlog/`에서 별도로 관리한다.

## 권장 착수 순서

1. `BACKLOG-001-note-list-reorder-and-group-move.md`
- 상태: Done
- 리스트 기반 그룹 이동과 그룹 뷰 버튼 정렬 구현 완료

2. `BACKLOG-002-note-loading-performance-and-caching.md`
- 2026-04-15 기준 1차 저위험 성능 개선 범위 완료, 후속 검토 이력으로 유지

## 문서 목록

1. `BACKLOG-001-note-list-reorder-and-group-move.md`
- 그룹 뷰 정렬 개선 및 리스트 기반 그룹 이동
- 상태: Done

2. `BACKLOG-002-note-loading-performance-and-caching.md`
- 노트/그룹 전환 체감 속도 개선 및 캐싱 검토
- 상태: Done (1차 저위험 개선 범위)
3. `BACKLOG-003-group-and-note-dnd-reorder.md`
- group sidebar reorder and note list reorder via DnD
- Status: Done
