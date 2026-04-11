# Features Index

기능 단위 요구사항과 구현/테스트 기준을 관리한다.

## 문서 목록

1. `FEATURE-001-auth.md`
- 인증(가입/로그인/로그아웃/세션)

2. `FEATURE-002-notes-core.md`
- 노트 핵심 기능(CRUD/정렬)

3. `FEATURE-003-groups.md`
- 그룹(Group) 기반 관리

4. `FEATURE-004-note-isolation.md`
- 노트 전환 독립성/무결성/충돌 처리

5. `FEATURE-005-editor-productivity.md`
- 편집 생산성(실시간 글자 수/전체 복사)

## 공통 작성 규칙

1. 기능 단위 문서는 아래 섹션을 포함한다.
- 목적/범위
- 사용자 시나리오
- 기능 요구사항
- API/데이터 계약
- 상태/예외 처리
- 테스트 기준(TDD 포인트)
- 오픈 이슈

2. PRD와 테스트 문서와의 추적성을 유지한다.
- PRD의 SR 번호를 기능 문서에 명시
- TEST_PLAN 시나리오와 1:1 또는 1:N 매핑
- 각 기능 문서에 `연계 테스트 시나리오` 섹션을 포함
