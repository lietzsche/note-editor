# Specs Overview

이 디렉터리는 인프라/운영 스펙만 관리한다.

- 서비스 요구사항/플로우: `docs/product/PRD.md`
- 테스트 시나리오/방식: `docs/testing/TEST_PLAN.md`
- 배포 실행 절차: `docs/operations/DEPLOY.md`

## 기술 스택 (Current / Target)

1. Frontend
- Current: React.js
- Target: React.js (유지)

2. Backend
- Current: Cloudflare Pages Functions (file-based handlers)
- Target: Hono.js on Cloudflare Pages Functions

3. Database
- Current: Cloudflare D1
- Target: Cloudflare D1 (유지)

## 스펙 문서 (2개)

1. `SPEC-01-cloudflare-project-bootstrap.md`
- Cloudflare Pages 프로젝트 설정, 권장 폴더 구조, 로컬 통합 실행 동작, 소스 가이드라인

2. `SPEC-02-d1-migration-framework.md`
- D1 스키마 관리 원칙, 그룹(Group) 포함 스키마 기준, migration 파일 운영 규칙

## 공통 플레이스홀더

- `<NEW_PAGES_PROJECT_NAME>`
- `<NEW_D1_DB_NAME>`
- `<NEW_D1_DB_ID>`
