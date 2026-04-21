# BACKLOG-001: 그룹 뷰 정렬 개선 및 리스트 기반 그룹 이동

- 문서 버전: v1.0
- 작성일: 2026-04-15
- 상태: Done
- 우선순위: Medium
- 성격: 후속 UX 확장
- 최근 업데이트일: 2026-04-15
- 기준 문서: `docs/features/FEATURE-006-note-list-reorder-and-group-move.md`, `docs/testing/backlog/TEST-BACKLOG-001-note-list-reorder-and-group-move.md`

## 0. 현재 구현 상태

1. Task 1 `리스트 기반 그룹 이동`은 구현 완료 상태다.
2. 노트 목록 항목 아래에 그룹 이동 select를 추가했고, 기존 `PATCH /api/notes/:id/group`를 재사용한다.
3. 현재 선택 중인 노트를 목록에서 이동하는 경우에도 기존 `pendingAction` 기반 전환 보호를 유지한다.
4. 그룹 scope reorder API와 그룹 뷰 버튼 기반 정렬 UI까지 구현 완료 상태다.
5. 이번 차수에서는 DnD 대신 기존 위/아래 이동 버튼을 그룹 뷰에서도 재사용하는 방식으로 마감했다.

## 1. 목적

현재 본선 WBS 범위에는 포함하지 않고, 후속 업무로 별도 관리할 기능 범위를 정의한다.

대상 범위:

1. 그룹 뷰에서의 노트 순서 변경
2. 노트 목록에서의 직접 그룹 이동

## 2. 왜 별도 후속 업무로 분리하는가

1. 현재 구현은 그룹 CRUD, 노트 이동, 전환 보호, 편집 생산성까지 본선 흐름이 이미 갖춰져 있다.
2. 그룹 뷰 정렬과 리스트 기반 그룹 이동은 체감 가치가 크지만, 상태 전이와 정렬 모델 결정이 추가로 필요하다.
3. 특히 그룹 필터 상태에서의 정렬은 기존 전역 `sort_order` 정책과 직접 맞물려 별도 결정이 선행되어야 한다.

따라서 본선 WBS에 억지로 포함하기보다, 후속 UX 개선 스트림으로 분리하는 편이 일정과 문서 책임이 명확하다.

## 3. 업무 목표

1. 노트를 열지 않고 목록에서 바로 다른 그룹으로 이동할 수 있게 한다.
2. 그룹을 보고 있는 상태에서도 노트 순서를 바꿀 수 있게 한다.
3. 기존 `dirty/saving/conflict` 전환 보호 정책을 깨지 않는다.
4. 접근성 기준상 드래그앤드롭 외 보조 정렬 수단도 유지한다.

## 4. 범위

### 4.1 포함

1. 노트 목록 항목 단건 그룹 이동 UI
2. 그룹 필터 상태 정렬 저장 정책
3. 그룹 뷰 드래그앤드롭 또는 동등한 정렬 UI
4. 키보드 fallback
5. 회귀 테스트와 관련 문서 갱신

### 4.2 제외

1. 다건 선택/일괄 그룹 이동
2. 칸반형 멀티 그룹 보드
3. 그룹 자체 순서 변경
4. 협업/실시간 공동 정렬

## 5. 선행 결정 사항

### 5.1 정렬 모델

우선 검토안:

1. 기존 `sort_order` 단일 컬럼 유지
2. 그룹 뷰 정렬은 해당 그룹 노트의 상대 순서만 바꾸는 전역 재정렬로 처리

결정 필요:

1. 그룹 뷰 정렬 결과가 전체 노트 화면에도 그대로 반영되는 정책을 수용할지
2. 장기적으로 그룹별 독립 정렬 모델이 필요한지

### 5.2 UI 범위

결정 필요:

1. 1차 버전에서 모바일 DnD를 지원할지
2. 데스크톱 우선 + 모바일은 보조 액션만 둘지
3. 목록 그룹 이동 UI를 드롭다운으로 둘지, 액션 메뉴로 둘지

## 6. 권장 구현 순서

### Task 1. 리스트 기반 그룹 이동

목표:

1. 목록에서 바로 그룹 이동 가능
2. 선택 중인 노트 이동 시 전환 보호 유지

주요 작업:

1. `NotesPage` 노트 아이템 액션 영역에 그룹 이동 메뉴 추가
2. 기존 `PATCH /api/notes/:id/group` 재사용
3. 현재 그룹 필터에서 빠지는 노트의 목록/선택 상태 동기화
4. 성공/실패 피드백 정리

완료 기준:

1. 목록에서 직접 그룹 이동 가능
2. 재조회 시 소속 정보 일치
3. `TS-B2` 시나리오 충족

### Task 2. 그룹 scope 정렬 API

목표:

1. 그룹 화면에서도 정렬 저장 가능

주요 작업:

1. `POST /api/notes/reorder` scope 확장 또는 동등한 계약 추가
2. 그룹 노트 집합 검증
3. 전체 순서 재계산 유틸 추가
4. 잘못된 group/note 조합 검증

완료 기준:

1. 그룹 필터 상태 정렬 요청 저장 가능
2. 잘못된 payload에 대한 실패 응답 명확
3. 통합 테스트 가능 상태 확보

### Task 3. 그룹 뷰 정렬 UI

목표:

1. 그룹 뷰에서 직관적 정렬 가능

주요 작업:

1. 드래그 핸들 또는 동등한 재정렬 UI 추가
2. 낙관적 업데이트 + 실패 롤백
3. 키보드 fallback 유지
4. 모바일 정책에 따른 동작 분기

완료 기준:

1. 그룹 필터 상태 정렬 가능
2. 재조회/재로그인 후 순서 유지
3. `TS-B3` 시나리오 충족

### Task 4. 안정화 및 문서

주요 작업:

1. `TS-B2`, `TS-B3` 수동 검증
2. 통합 테스트 추가
3. 필요 시 `PRD`, `TEST_PLAN`, `FEATURE-006`, 상태 문서 갱신

완료 기준:

1. 회귀 없이 기능 동작
2. 후속 범위 문서와 테스트 문서가 일치

## 7. 예상 영향 파일

- `src/pages/NotesPage.tsx`
- `src/lib/api.ts`
- `functions/api/[[path]].ts`
- `tests/api/auth.test.ts`
- `docs/testing/backlog/TEST-BACKLOG-001-note-list-reorder-and-group-move.md`
- `docs/features/FEATURE-006-note-list-reorder-and-group-move.md`

분리 후보:

- `src/components/NoteListItem.tsx`
- `src/components/NoteGroupMoveMenu.tsx`
- `src/lib/noteOrder.ts`

## 8. 수용 기준

1. 목록에서 노트를 직접 다른 그룹으로 이동할 수 있다.
2. 그룹 필터 화면에서 노트 순서를 변경하고 유지할 수 있다.
3. 선택 노트 이동/정렬 과정에서 미저장 변경 보호가 깨지지 않는다.
4. 마우스 외 입력 방식으로도 정렬 가능하다.
5. `TS-B2`, `TS-B3`와 관련 회귀 시나리오가 충족된다.

## 9. 오픈 이슈

1. 그룹 뷰 정렬을 API 확장으로 갈지, 별도 endpoint로 분리할지
2. 그룹 필터 상태에서 전체 노트 정렬 의미를 사용자에게 어떻게 설명할지
3. 모바일에서 DnD를 실제 지원할지, 보조 액션만 유지할지

## 10. 연계 문서

- `docs/features/FEATURE-006-note-list-reorder-and-group-move.md`
- `docs/testing/TEST_PLAN.md`
- `docs/features/FEATURE-002-notes-core.md`
- `docs/features/FEATURE-003-groups.md`

## 11. 진행 이력

- 2026-04-15: backlog 초안 작성
- 2026-04-15: `NotesPage` 노트 목록 항목에 그룹 이동 UI 추가
- 2026-04-15: 선택 중인 노트 이동 시 전환 보호를 유지하도록 `pendingAction` 경로 확장
- 2026-04-15: `noteGroupSelect` 유틸 및 단위 테스트 추가
- 2026-04-15: `POST /api/notes/reorder`에 group scope 계약 추가
- 2026-04-15: 그룹 뷰에서도 버튼 기반 정렬이 가능하도록 프론트 정렬 경로 확장
- 2026-04-15: `noteOrder` 유틸, 단위 테스트, 그룹 scope reorder 통합 테스트 추가
- 2026-04-15: `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build`, `npm.cmd run test:integration` 통과
# Historical Note (2026-04-16)

This document reflects the earlier button-based reorder baseline that shipped before DnD.
The current canonical reorder policy and implementation are documented in:

- `docs/backlog/BACKLOG-003-group-and-note-dnd-reorder.md`
- `docs/testing/backlog/TEST-BACKLOG-004-group-and-note-dnd-reorder.md`

Any references below to up/down button fallback, limited mobile DnD, or "DnD not included"
should be treated as historical context only, not as current requirements.
