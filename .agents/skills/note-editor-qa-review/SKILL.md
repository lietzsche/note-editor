---
name: note-editor-qa-review
description: "note-editor의 QA와 검증 전략용 skill. 기능 완료 전 테스트 범위 점검, 수동 QA 시나리오 작성, 자동화 테스트 계획, release readiness, npm run verify 실패 분석, 배포 전 회귀 체크리스트를 만들 때 사용한다."
---

# Note Editor QA Review

## 목적

기능이 “작동하는 것처럼 보이는지”가 아니라 요구사항과 주요 회귀 위험을 충분히 검증했는지 확인한다.

## 먼저 확인할 것

1. `docs/testing/TEST_PLAN.md`에서 전체 시나리오와 판정 기준을 확인한다.
2. 관련 `docs/features/FEATURE-*.md`에서 기능별 테스트 기준을 확인한다.
3. 변경된 코드와 테스트를 확인한다.
4. 배포나 DB가 관련되면 `docs/operations/DEPLOY.md`와 `docs/specs/`도 확인한다.

## 검증 관점

- PRD/SR 수용 기준이 테스트로 확인되는가.
- 계정 격리, 인증/세션, 공유 링크 보안이 깨지지 않는가.
- 노트 전환, 자동 저장, 충돌 처리, 복사, 글자 수, reorder가 회귀하지 않는가.
- 모바일과 데스크톱 핵심 플로우를 모두 확인했는가.
- 실패/빈 상태/loading 상태가 확인되었는가.
- 자동화 테스트와 수동 QA의 역할이 분리되어 있는가.

## 산출물 형태

- 변경 요약.
- 자동화 테스트 범위.
- 수동 QA 시나리오.
- 배포 전 확인.
- 남은 리스크.
- 권장 명령.

## 명령 기준

- `npm run typecheck`: 타입 계약과 빌드 전 정적 오류 확인.
- `npm run test:unit`: 빠른 단위/React 회귀 확인.
- `npm run test:integration`: API, Workers, D1 계약 확인.
- `npm run verify`: CI와 동일한 전체 gate.

## 예시 요청

- “이번 변경 배포 전에 QA 체크리스트 만들어줘.”
- “자동 저장 관련 테스트 범위가 충분한지 봐줘.”
- “npm run verify 실패 원인을 QA 관점에서 정리하고 수정 우선순위 제안해줘.”
