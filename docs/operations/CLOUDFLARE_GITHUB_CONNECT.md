# CLOUDFLARE_GITHUB_CONNECT.md

- 문서 버전: v1.1
- 작성일: 2026-04-11
- 상태: **완료**
- 목적: Cloudflare Workers + GitHub 연동 설정 기록

## 1. 연동 완료 상태

| 항목 | 값 |
|---|---|
| 플랫폼 | Cloudflare Workers (신규 통합 플랫폼) |
| 프로젝트명 | `note-editor` |
| GitHub 저장소 | `lietzsche/note-editor` |
| 프로덕션 브랜치 | `main` |

## 2. 빌드 구성 (확정)

| 항목 | 값 |
|---|---|
| 빌드 명령 | 없음 (공란) |
| 배포 명령 | `npm run deploy` |
| 버전 명령 | `npx wrangler versions upload` |
| 루트 디렉터리 | `/` |

> `npm run deploy` = `npm run build && npx wrangler deploy`
> 정적 파일 위치는 `wrangler.toml`의 `[assets] directory = "./build"`로 관리한다.

## 3. 환경변수 및 시크릿

| 항목 | 등록 방법 | 상태 |
|---|---|---|
| `AUTH_SESSION_SECRET` | `npx wrangler secret put AUTH_SESSION_SECRET` | 완료 |
| `AUTH_SESSION_TTL_SECONDS` | 선택값, 기본 604800 (7일) | - |

## 4. D1 바인딩

| 항목 | 값 |
|---|---|
| Variable name | `DB` |
| database_name | `note-editor-db` |
| database_id | `c633c65e-4033-4ae7-ba5b-d753e1cb557e` |

> D1 바인딩은 `wrangler.toml`에 정의되어 있으며 CI 배포 시 자동 적용된다.

## 5. 체크리스트

- [x] 실행 가능한 앱 소스 추가
- [x] `package.json` 추가
- [x] `wrangler.toml` 추가
- [x] 실제 `Build command` 확정 (없음, 배포 명령으로 통합)
- [x] 실제 배포 명령 확정 (`npm run deploy`)
- [x] `Root directory` 확정 (`/`)
- [x] D1 바인딩 설정 완료
- [x] `AUTH_SESSION_SECRET` 시크릿 등록 완료
- [x] D1 마이그레이션 remote apply 완료
- [x] 첫 정상 배포 완료 (React 앱 서빙 확인)

## 6. 참고 문서

- Cloudflare Workers Git integration: <https://developers.cloudflare.com/workers/ci-cd/github-actions/>
- Cloudflare Workers Assets: <https://developers.cloudflare.com/workers/static-assets/>
- wrangler.toml 설정 기준: `docs/specs/SPEC-01-cloudflare-project-bootstrap.md`
- 배포 절차: `docs/operations/DEPLOY.md`
