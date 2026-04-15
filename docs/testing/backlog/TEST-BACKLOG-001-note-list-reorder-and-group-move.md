# TEST-BACKLOG-001: 그룹 뷰 정렬 개선 및 리스트 기반 그룹 이동

- 문서 버전: v1.0
- 작성일: 2026-04-15
- 연계 backlog: `docs/backlog/BACKLOG-001-note-list-reorder-and-group-move.md`

## 1. 목적

`BACKLOG-001`이 구현 범위로 승격될 경우 사용할 테스트 초안을 관리한다.

## 1.1 현재 구현 상태

1. `TB-001 리스트 기반 그룹 이동` 범위는 구현됨
2. `TB-002 그룹 뷰 정렬` 범위는 버튼 기반 UI로 구현됨
3. DnD는 이번 차수에 포함하지 않고, 키보드 친화적인 위/아래 이동 버튼으로 마감했다

## 2. 수동 시나리오

### TB-001 리스트 기반 그룹 이동

1. 그룹 2개 생성(예: Work, Personal)
2. 각 그룹에 노트 1건 이상 생성
3. 노트 목록 항목에서 그룹 이동 액션 실행
4. 현재 그룹 필터 상태와 전체 노트 상태를 각각 재조회
5. 선택 중인 노트를 이동하는 경우 편집 상태와 화면 전환도 함께 확인

기대 결과:

- 노트를 열지 않고 목록에서 직접 그룹 이동이 가능함
- 이동 후 소속 정보가 재조회 시 일치함
- 현재 필터 그룹에서 빠진 노트는 목록에서 즉시 제거됨
- 선택 중인 노트 이동 시 미저장 변경 보호 정책이 유지됨

### TB-002 그룹 뷰 정렬/DnD

1. 그룹 `Work`에 노트 3건 이상 생성
2. 그룹 `Work` 필터 화면에서 노트 순서를 드래그앤드롭 또는 키보드 fallback으로 변경
3. 그룹 필터 재조회
4. 전체 노트 화면 재조회
5. 재로그인 후 그룹 필터와 전체 노트 화면을 다시 확인

기대 결과:

- 그룹 필터 화면에서 정렬 변경이 가능함
- 그룹 내부 상대 순서가 재조회 후 유지됨
- 비대상 그룹 노트의 상대 순서는 보존됨
- 재로그인 후에도 정렬 결과가 유지됨

## 3. 자동화 후보

1. 통합 테스트
- 그룹 scope reorder 성공
- 그룹 scope reorder 실패(누락/중복/타 사용자 group)
- 리스트 기반 그룹 이동 후 그룹 필터 결과 반영

2. E2E 테스트
- 데스크톱 DnD 플로우
- 키보드 fallback 플로우

## 4. 승격 조건

1. `BACKLOG-001`이 구현 범위로 확정된다.
2. 정렬 scope/API 계약이 확정된다.
3. 모바일 DnD 지원 범위가 확정된다.

## 5. 현재 검증 결과

- 2026-04-15: `npm.cmd run typecheck` 통과
- 2026-04-15: `npm.cmd run test:unit` 통과
- 2026-04-15: `npm.cmd run build` 통과
- 2026-04-15: `npm.cmd run test:integration` 통과
- 남은 확인: 실제 브라우저에서 `TB-001`, `TB-002` 수동 검증
# Historical Note (2026-04-16)

This test backlog describes the earlier pre-DnD baseline.
The current canonical DnD reorder QA and acceptance criteria are documented in:

- `docs/backlog/BACKLOG-003-group-and-note-dnd-reorder.md`
- `docs/testing/backlog/TEST-BACKLOG-004-group-and-note-dnd-reorder.md`

Any references below to button-based reorder fallback or "DnD not included"
should be treated as historical coverage only.
