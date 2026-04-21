# 노트 편집기 V2 문서 인덱스

## V2 개발 개요

노트 편집기 V2는 기존 V1 코드베이스에서 독립적으로 새롭게 시작하는 프로젝트입니다. 브랜치를 `v2`로 생성하고 Cloudflare에 새 프로젝트를 만들어 완전히 분리된 환경에서 개발합니다.

## 개발 시작 순서

V2 개발은 아래 순서대로 진행합니다:

### 1단계: 환경 설정 및 초기화
1. `v2` 브랜치 생성 및 설정
2. Cloudflare 새 프로젝트 생성
3. D1 데이터베이스 새로 설정
4. 개발 환경 구성

### 2단계: V1 핵심 기능 재구현
1. 인증 시스템 (회원가입, 로그인, 로그아웃)
2. 노트 CRUD 기능
3. 그룹 관리 기능
4. 노트 정렬 및 DnD 기능

### 3단계: V2 신규 기능 구현
1. 관리자 기능 및 비밀번호 초기화
2. 노트 공개 URL 기능
3. PWA 지원
4. 검색 및 태그 시스템

### 4단계: 테스트 및 배포
1. 종합 테스트 수행
2. 프로덕션 배포
3. 모니터링 설정

## 문서 목록

### 0. 시작하기
- `docs-v2/GETTING-STARTED.md` - V2 개발 시작 가이드
- `docs-v2/BRANCH-STRATEGY.md` - 브랜치 전략 및 작업 흐름
- `docs-v2/PROJECT-SETUP.md` - Cloudflare 새 프로젝트 설정

### 1. 제품 기획
- `docs-v2/product/PRD-V2.md` - V2 제품 요구사항 명세
- `docs-v2/product/WBS-V2.md` - V2 작업 분해 구조

### 2. 기술 설계
- `docs-v2/specs/ARCHITECTURE-V2.md` - V2 아키텍처 설계
- `docs-v2/specs/DATABASE-MIGRATION.md` - D1 데이터베이스 마이그레이션 가이드
- `docs-v2/specs/API-DESIGN.md` - API 설계 문서

### 3. 기능 상세
- `docs-v2/features/FEATURE-001-auth-v2.md` - 인증 시스템 (V2)
- `docs-v2/features/FEATURE-002-notes-core-v2.md` - 노트 코어 기능 (V2)
- `docs-v2/features/FEATURE-003-groups-v2.md` - 그룹 관리 (V2)
- `docs-v2/features/FEATURE-011-admin-management.md` - 관리자 기능 (NEW)
- `docs-v2/features/FEATURE-012-public-note-sharing.md` - 노트 공개 URL 기능 (NEW)
- `docs-v2/features/FEATURE-008-pwa-support.md` - PWA 지원
- `docs-v2/features/FEATURE-009-search-and-tags.md` - 검색 및 태그 시스템

### 4. 디자인
- `docs-v2/design/DESIGN-GUIDELINES-V2.md` - V2 디자인 가이드라인
- `docs-v2/design/COMPONENT-GUIDE-V2.md` - 컴포넌트 가이드 (V2)

### 5. 테스트
- `docs-v2/testing/TEST-PLAN-V2.md` - V2 테스트 계획
- `docs-v2/testing/TEST-CASES.md` - 상세 테스트 케이스

### 6. 운영
- `docs-v2/operations/DEPLOYMENT-V2.md` - V2 배포 가이드
- `docs-v2/operations/MONITORING.md` - 모니터링 설정

### 7. 백로그
- `docs-v2/backlog/BACKLOG-V2.md` - V2 백로그 관리
- `docs-v2/backlog/ADMIN-FEATURES.md` - 관리자 기능 상세
- `docs-v2/backlog/PUBLIC-SHARING.md` - 공개 노트 기능 상세

### 8. 진행 상황
- `docs-v2/status/STATUS-PHASE1.md` - 1단계 진행 상황
- `docs-v2/status/STATUS-PHASE2.md` - 2단계 진행 상황
- `docs-v2/status/STATUS-PHASE3.md` - 3단계 진행 상황
- `docs-v2/status/STATUS-PHASE4.md` - 4단계 진행 상황

## 문서 작성 규칙

1. 모든 문서는 한글로 작성합니다.
2. 문서 버전은 `v2.x` 형식을 사용합니다.
3. 각 개발 단계별로 상태 문서를 작성하여 진행 상황을 추적합니다.
4. 기능별 문서는 구현 전에 작성하고 검토합니다.

## 빠른 시작

V2 개발을 시작하려면 다음 문서를 순서대로 읽으세요:

1. `docs-v2/GETTING-STARTED.md` - 개발 환경 설정
2. `docs-v2/BRANCH-STRATEGY.md` - 브랜치 전략 이해
3. `docs-v2/PROJECT-SETUP.md` - Cloudflare 프로젝트 생성
4. `docs-v2/product/PRD-V2.md` - 제품 요구사항 확인

## 연락처 및 지원

- 프로젝트 리드: [이름]
- 기술 문의: [이메일]
- 문서 관리: [이름]

## 최근 업데이트

- 2026-04-21: V2 문서 구조 초기화 완료
- 2026-04-21: 개발 시작 순서 정의
- 2026-04-21: 새 기능 요구사항 반영