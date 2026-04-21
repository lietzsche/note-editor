# INIT: 프로젝트 초기 세팅 가이드

처음 이 프로젝트를 세팅하는 경우 이 문서를 순서대로 따라한다.

## 사전 준비

- Node.js 18 이상
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare 계정 및 로그인

```bash
npx wrangler login
```

## 1. 저장소 클론 및 의존성 설치

```bash
git clone <REPO_URL>
cd note-editor
npm install
```

## 2. Cloudflare Pages 프로젝트 생성

```bash
npx wrangler pages project create <NEW_PAGES_PROJECT_NAME>
```

프로젝트명을 기록해둔다. 이후 `wrangler.toml`과 `package.json`에 반영한다.

## 3. D1 데이터베이스 생성

```bash
npx wrangler d1 create <NEW_D1_DB_NAME>
```

출력 결과에서 `database_id`를 기록해둔다.

```bash
# 확인
npx wrangler d1 list
```

## 4. `wrangler.toml` 설정

프로젝트 루트에 `wrangler.toml`을 생성하고 앞서 기록한 값을 반영한다.

```toml
name = "<NEW_PAGES_PROJECT_NAME>"
account_id = "<CLOUDFLARE_ACCOUNT_ID>"
compatibility_date = "2024-01-01"
main = "functions/api/[[path]].ts"

[assets]
directory = "./build"
binding = "ASSETS"
not_found_handling = "single-page-application"

[[d1_databases]]
binding = "DB"
database_name = "<NEW_D1_DB_NAME>"
database_id = "<NEW_D1_DB_ID>"
```

## 5. 로컬 환경변수 설정

`.dev.vars.example`을 복사해 `.dev.vars`를 생성하고 값을 채운다.

```bash
cp .dev.vars.example .dev.vars
```

```ini
AUTH_PASSWORD=<로컬_테스트_비밀번호>
AUTH_SESSION_SECRET=<로컬_세션_시크릿_32자_이상>
AUTH_SESSION_TTL_SECONDS=604800
```

> `.dev.vars`는 `.gitignore`에 포함되어 있어야 한다.
> Cloudflare 계정이 여러 개면 `CLOUDFLARE_ACCOUNT_ID`를 확인해 `wrangler.toml`에 함께 반영한다.

## 6. 로컬 마이그레이션 적용

```bash
npm run migrate:apply:local
```

적용 상태 확인:

```bash
npm run migrate:list:local
```

## 7. 로컬 실행 확인

```bash
npm run dev
```

브라우저에서 `http://localhost:8788` 접속 후 확인한다.

## 8. Cloudflare Pages GitHub 연동 설정

GitHub 저장소와 Cloudflare Pages를 연동하는 경우, 대시보드에서 아래 값을 입력한다.

| 항목 | 값 |
|---|---|
| **Build command** | `npm run build` |
| **Build output directory** | `build` |
| **Root directory** | `/` (기본값 유지) |

> `npm run build`는 Vite를 실행해 `build/` 디렉터리에 산출물을 생성한다.

## 9. 원격 배포가 필요한 경우

원격 배포는 로컬 개발이 충분히 진행된 후 수행한다.
절차는 `docs/operations/DEPLOY.md`를 따른다.

---

## 관련 문서

- `docs/specs/SPEC-01-cloudflare-project-bootstrap.md` — 프로젝트 구조/설정 스펙
- `docs/specs/SPEC-02-d1-migration-framework.md` — D1 마이그레이션 프레임워크
- `docs/operations/DEPLOY.md` — 원격 배포 절차
