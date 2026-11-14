<p align="center">
  <img src="public/icon.svg" alt="note-editor icon" width="72" height="72" />
</p>

<h1 align="center">note-editor</h1>

<p align="center">
  Cloudflare Workers와 D1 기반으로 동작하는 React + TypeScript 노트 편집기 (PWA)
</p>

---

`note-editor`는 마크다운 편집 생산성, 그룹별 노트 정리, 공개 공유, 계정 격리 및 관리자 기능을 제공하는 풀스택 노트 웹 애플리케이션입니다. 프론트엔드는 Vite + React로 빌드해 Cloudflare Workers Assets로 서빙하며, API는 `functions/api/[[path]].ts`의 Hono 라우터와 Cloudflare D1 데이터베이스로 처리합니다.

> [!NOTE]
> 운영 환경은 `main` 브랜치 푸시 시 Cloudflare Workers Builds를 통해 `https://note.lietzsche.org`로 자동 배포되도록 구성되어 있습니다. 상세 운영 절차는 [`docs/operations/DEPLOY.md`](docs/operations/DEPLOY.md)와 [`docs/operations/CLOUDFLARE_GITHUB_CONNECT.md`](docs/operations/CLOUDFLARE_GITHUB_CONNECT.md)를 참고하세요.

## 주요 기능

- **노트 및 그룹 관리**: 그룹 생성/이름 변경/삭제, `@dnd-kit` 기반 그룹·노트 드래그 앤 드롭 순서 변경, 휴지통(소프트 삭제)·복원·영구 삭제
- **편집 생산성**: 마크다운 서식 툴바 및 단축키, 자동 저장 및 충돌 직렬화, 데스크톱 자동 집중 모드, 검색어 하이라이트, 전체 복사, 글자 수 표시, 맞춤법 검사 링크
- **공개 공유**: 노트별 공유 링크(`/shared/:shareToken`) 생성·만료·비활성화 및 조회수 집계
- **계정 인증 및 운영**: 회원가입/로그인/로그아웃, 세션 쿠키 인증, 비밀번호 변경, 관리자 비밀번호 초기화(`/api/admin/*`) 및 감사 로그
- **테마 및 PWA**: 라이트/다크 테마 전환, 모바일 뒤로가기 흐름 지원, 웹 앱 매니페스트 및 아이콘 제공

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router DOM, `@dnd-kit` |
| Backend / Edge | Cloudflare Workers, Hono |
| Database | Cloudflare D1 (SQLite), Wrangler Migrations |
| Testing | Vitest, `@cloudflare/vitest-pool-workers` |
| CI / Deploy | GitHub Actions (`npm run verify`), Cloudflare Workers Builds |

## 프로젝트 구조

```text
note-editor/
├── src/                  # React 클라이언트 앱 (components, pages, lib, styles)
├── functions/api/        # Cloudflare Workers Hono API 엔드포인트 및 공용 헬퍼
├── migrations/           # D1 데이터베이스 마이그레이션 SQL
├── schema.sql            # 현재 D1 스키마 기준 정의
├── public/               # PWA 매니페스트 및 정적 아이콘 자산
├── tests/                # 단위/UI 테스트 및 tests/api/ Workers 통합 테스트
├── docs/                 # 제품(PRD), 기능, 설계, 운영, 테스트 문서
├── wrangler.toml         # Workers, Assets, D1 바인딩 및 커스텀 도메인 설정
└── .github/workflows/    # CI 검증 워크플로우 (ci.yml)
```

## 시작하기

### 사전 요구사항

- Node.js 22+ 및 npm
- Cloudflare Wrangler CLI (프로젝트 `devDependencies`에 포함)

### 로컬 개발 환경 설정

1. 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. `.dev.vars.example`을 복사해 로컬 환경 변수 파일(`.dev.vars`)을 생성합니다.

   ```bash
   cp .dev.vars.example .dev.vars
   ```

   `.dev.vars`의 `AUTH_SESSION_SECRET`은 32자 이상의 임의 문자열로 설정합니다.

3. 로컬 D1 데이터베이스에 마이그레이션을 적용합니다.

   ```bash
   npm run migrate:apply:local
   ```

4. 로컬 통합 개발 서버를 실행합니다.

   ```bash
   npm run dev
   ```

   빌드 후 `http://localhost:8788`에서 프론트엔드와 `/api/*` Worker를 함께 실행합니다. 실시간 프론트엔드 빌드가 필요하면 `npm run dev:watch`를 사용합니다.

## 주요 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 프로덕션 빌드 후 `wrangler dev --port 8788` 실행 |
| `npm run dev:watch` | Vite watch 빌드와 `wrangler dev` 동시 실행 |
| `npm run build` | `build/` 디렉터리에 Vite 프로덕션 빌드 생성 |
| `npm run typecheck` | TypeScript 엄격 타입 검사 (`tsc --noEmit`) |
| `npm run test:unit` | 비 API 단위 및 React 컴포넌트 테스트 실행 |
| `npm run test:integration` | 빌드 후 Cloudflare Workers API 통합 테스트 실행 |
| `npm run verify` | CI 게이트와 동일하게 `typecheck` 및 전체 테스트 실행 |
| `npm run migrate:create` | 새 D1 마이그레이션 파일 생성 |
| `npm run migrate:apply:local` | 로컬 D1에 마이그레이션 적용 |
| `npm run migrate:apply:remote` | 원격 D1에 마이그레이션 적용 |
| `npm run deploy` | 수동 빌드 및 Cloudflare Workers 배포 |

## 배포 및 CI

- **CI 검증**: Pull Request 및 `main` 브랜치 푸시 시 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)에서 `npm run verify`를 실행합니다.
- **자동 배포**: Cloudflare Workers Builds가 GitHub 저장소(`main`)와 연동되어 있으며, D1 바인딩(`DB` -> `note-editor-db`)과 커스텀 도메인(`note.lietzsche.org`)은 [`wrangler.toml`](wrangler.toml)에 정의되어 있습니다.

> [!IMPORTANT]
> 운영 환경 배포 전 `AUTH_SESSION_SECRET`, `ADMIN_USERNAMES` 등 시크릿이 Cloudflare Workers에 등록되어 있는지 확인하고, 스키마 변경 시 원격 D1 마이그레이션(`npm run migrate:apply:remote` 또는 `deploy:ci`)을 함께 반영해야 합니다.

## 상세 문서

기능 명세, 설계 시스템, 테스트 계획, 백로그 및 운영 문서는 [`docs/README.md`](docs/README.md)에서 확인할 수 있습니다.
