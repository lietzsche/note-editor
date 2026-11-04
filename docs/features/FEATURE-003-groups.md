# FEATURE-003: 그룹(Group) 기반 관리

- 문서 버전: v1.0
- 작성일: 2026-04-11
- 연계 PRD: SR-8

## 1. 목적/범위

노트를 그룹 단위로 분류하고 탐색하는 기능을 제공한다.

## 2. 사용자 시나리오

1. 사용자가 그룹을 생성한다.
2. 그룹별로 노트를 생성/조회한다.
3. 노트를 다른 그룹으로 이동한다.
4. 그룹 이름을 변경한다.
5. 그룹을 삭제하고 소속 노트 처리 정책을 확인한다.

## 3. 기능 요구사항

1. 그룹 생성/조회/수정/삭제가 가능해야 한다.
2. 그룹 필터 조회 시 해당 그룹 노트만 반환해야 한다.
3. 그룹 미지정 상태(기본 그룹)도 정상 지원해야 한다.
4. 그룹 삭제 시 소속 노트는 기본 그룹(미분류)으로 이동한다.
5. 기본 그룹은 삭제할 수 없다.
6. 기본 그룹은 회원가입 시 자동 생성한다.
7. 그룹 이름은 1~40자, 사용자별 그룹 수는 최대 30개로 제한한다.

## 4. API/데이터 계약

1. 엔드포인트(권장)
- `GET /api/groups`
- `POST /api/groups`
- `PUT /api/groups/:id`
- `DELETE /api/groups/:id`
- `PATCH /api/notes/:id/group`
- `PATCH /api/notes/:id`의 `group_id` 필드 갱신도 호환 경로로 허용한다.

2. 데이터 필드(핵심)
- API 응답 핵심: `id`, `name`, `position`
- 저장소 내부 필드: `user_id`, `created_at`, `updated_at`
- `notes/pages`: `group_id`

3. 그룹 이동 payload 규격
- `PATCH /api/notes/:id/group`
- body: `{"group_id":"group_x"}`
- `group_id: null` 요청은 기본 그룹(미분류)로 정규화한다.

## 5. 상태/예외 처리

1. 그룹명 중복 -> 같은 사용자 내 중복 금지(`409`)
2. 존재하지 않는 그룹 -> 이동/수정/삭제 실패
3. 타 사용자 그룹 접근 -> 권한 오류
4. 삭제 대상 그룹이 기본 그룹일 때 -> 삭제 불가(요청 실패)로 처리
5. 기본 그룹(미분류)은 이름 변경도 허용하지 않는다.

## 6. 테스트 기준(TDD 포인트)

1. Red
- 중복 그룹명, 잘못된 group_id, 타 사용자 접근 실패 테스트 선작성

2. Green
- 그룹 CRUD 및 그룹 필터 조회 최소 구현 통과

3. Refactor
- 그룹 권한 검증과 노트 이동 정책 로직 분리

## 7. 오픈 이슈

1. 그룹 정렬(position) 업데이트 API의 배치 변경 정책 확정 필요

## 8. 연계 테스트 시나리오

- `docs/testing/TEST_PLAN.md` TS-07
## 9. 2026-04-16 DnD Update

1. Groups now support persisted reorder through `POST /api/groups/reorder`.
2. Sidebar group order is managed with `@dnd-kit` drag-and-drop on desktop, mobile, and keyboard flows.
3. The default group participates in reorder, but rename/delete restrictions remain unchanged.
4. Automated coverage for group reorder success and validation failures lives in `tests/api/auth.test.ts`.

## PC 통합 사이드바 (2026-11-04)

- PC에서는 그룹 패널과 노트 목록을 너비 288px의 사이드바 하나로 통합한다. 노트를 전환하기 위해 별도 그룹 패널을 펼칠 필요가 없도록 한다.
- 상단 그룹 선택 메뉴에서 전체 노트, 휴지통, 개별 그룹을 선택한다. 검색과 새 노트 버튼은 목록 위에 둔다.
- 그룹 생성, 이름 변경, 삭제, 순서 변경은 상단의 `그룹 관리`를 펼쳐 사용한다. 기존 기본 그룹 보호와 그룹 삭제 정책을 유지한다.
- 노트 목록은 제목과 본문 미리보기 한 줄로 표시한다. 검색 중에는 일치 부분 미리보기를 유지하고, 휴지통에서는 삭제 시각과 복원/영구 삭제 기능을 유지한다.
- 계정 보안, 테마, 가이드, 운영 패널(권한 보유 시), 로그아웃은 하단 계정 버튼으로 펼친다. Escape로 닫으면 계정 버튼으로 초점이 돌아간다.
- 사이드바 접기와 집중 모드를 유지하며 모바일의 그룹/목록/편집 화면 전환은 유지한다.
- 목록의 로딩, 빈 상태, 오류, 재시도 표시는 기존 흐름을 유지한다.
