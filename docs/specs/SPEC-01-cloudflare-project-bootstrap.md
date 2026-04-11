# SPEC-01: Cloudflare 프로젝트 설정 및 로컬 통합 실행 구조

## 1. 목적

Cloudflare Pages 프로젝트 설정, 프론트/백엔드 소스 배치, 로컬 통합 실행 동작, 소스 가이드라인을 표준화한다.

## 2. 입력값

- `<NEW_PAGES_PROJECT_NAME>`
- `<NEW_D1_DB_NAME>`
- `<NEW_D1_DB_ID>`

## 2.1 기술 스택 명세 (Current / Target)

1. Frontend
- Current: React.js
- Target: React.js (유지)

2. Backend
- Current: Cloudflare Pages Functions (file-based handlers)
- Target: Hono.js on Cloudflare Pages Functions

3. Database
- Current: Cloudflare D1
- Target: Cloudflare D1 (유지)

## 2.2 현재 상태와 목표 상태

1. 현재 저장소는 문서 중심 구조일 수 있다.
2. 실행 가능한 애플리케이션 구조는 본 스펙의 부트스트랩 단계에서 생성/정렬한다.
3. 배포 절차(`docs/operations/DEPLOY.md`)는 부트스트랩 완료 후 수행한다.

## 3. 권장 폴더 구조

```text
note-editor/
  README.md                 # 루트 진입 문서
  docs/
    README.md               # 문서 인덱스
    product/PRD.md          # 서비스 요구사항
    testing/TEST_PLAN.md    # 테스트 시나리오
    operations/DEPLOY.md    # 배포 실행 절차
    specs/                  # 인프라 스펙
  src/                      # Frontend 소스 (React)
  public/                   # Frontend 정적 리소스
  functions/
    api/                    # Backend API 엔트리 (Hono 라우팅 기준)
      _lib/                 # Backend 공통 유틸/인증 로직
  migrations/               # D1 migration 파일 (append-only)
  schema.sql                # 초기 스키마(부트스트랩 기준)
  wrangler.toml             # Cloudflare 프로젝트/D1 바인딩 설정
  .dev.vars.example         # 로컬 환경변수 템플릿
```

구조 원칙:
- 프론트엔드는 `src/`에서만 관리한다.
- 백엔드는 `functions/api/`에서만 관리한다. (Target: Hono 라우트 구성)
- D1 스키마 변경은 `migrations/`에서만 관리한다.

## 4. Cloudflare 설정 스펙

### 4.1 `wrangler.toml`

```toml
name = "<NEW_PAGES_PROJECT_NAME>"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "<NEW_D1_DB_NAME>"
database_id = "<NEW_D1_DB_ID>"
```

### 4.2 `package.json` 배포 스크립트

```json
"deploy": "npm run build && npx wrangler pages deploy build/ --project-name <NEW_PAGES_PROJECT_NAME>"
```

### 4.3 환경변수/시크릿

- `AUTH_PASSWORD`
- `AUTH_SESSION_SECRET`
- `AUTH_SESSION_TTL_SECONDS` (선택)

## 4.4 Hono 엔트리 계약 (Target)

1. API 엔트리는 `functions/api/[[path]].ts` 단일 진입점을 사용한다.
2. 라우팅은 Hono 앱에서 `/api/*` 하위 경로를 관리한다.
3. 미들웨어 순서는 아래를 따른다.
- request-id/로깅
- 인증/세션 검증
- 권한 검사(리소스 소유권)
- 핸들러 실행
- 에러 변환(JSON 응답)
4. 에러 응답 포맷은 `{"error":{"code":"...","message":"..."}}`로 통일한다.

## 5. 로컬 실행 동작 (통합 모드 표준)

### 5.1 통합 모드

동작 개념:
- 단일 오리진으로 프론트+백엔드를 함께 띄운다.
- 브라우저는 하나의 URL(예: `http://localhost:8788`)만 사용한다.
- `/api/*` 요청은 동일 오리진에서 `functions/api/*`로 라우팅된다.

표준 스크립트 규격:
- `npm run dev`: 빌드 결과 + Pages Functions를 로컬에서 통합 실행
- `npm run dev:watch`: 프론트 변경 감시 빌드 + Pages dev 동시 실행

### 5.2 로컬 테스트 기준

- 로컬 기능 테스트와 인수 테스트는 통합 모드에서 수행한다.
- 테스트 수행 URL은 단일 오리진(`http://localhost:8788`)을 기준으로 한다.
- 분리 모드는 본 프로젝트의 기본 개발/검증 모드로 채택하지 않는다.

## 6. 소스 가이드라인

### 6.1 파일/함수 길이 기준

| 대상 | 권장 | 상한(초과 시 분리) |
|---|---:|---:|
| React 페이지/컨테이너 파일 | 250 lines 이하 | 350 lines |
| React 공용 컴포넌트 파일 | 180 lines 이하 | 250 lines |
| API 라우트 파일(`functions/api/*`) | 180 lines 이하 | 260 lines |
| 공용 유틸 파일(`_lib`/`src/lib`) | 150 lines 이하 | 220 lines |
| 함수 1개 길이 | 40 lines 이하 | 60 lines |

### 6.2 함수 설계 기준

- 함수는 한 가지 책임만 수행한다.
- 함수 파라미터는 5개 이하를 권장한다.
- 중첩 깊이(`if/for`)는 3단계 이하를 권장한다.
- 라우트 핸들러는 `입력 검증 -> 권한 확인 -> 비즈니스 로직 -> 응답 생성` 순서를 유지한다.

### 6.3 분리 규칙

- 상한을 초과하면 즉시 분리한다.
- API 파일이 커지면 검증/쿼리/응답 매핑을 `_lib`로 분리한다.
- UI 파일이 커지면 화면 컨테이너와 프리젠테이셔널 컴포넌트를 분리한다.

## 7. 확인 항목

- [ ] Pages 프로젝트명 반영 완료
- [ ] D1 바인딩 반영 완료
- [ ] deploy 스크립트 반영 완료
- [ ] 프론트/백엔드 폴더 구조 반영 완료
- [ ] 통합 모드 로컬 실행 확인 완료
- [ ] 파일/함수 길이 기준 준수 확인 완료
- [ ] 로컬 개발 환경 변수 준비 완료
