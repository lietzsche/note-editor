# CLOUDFLARE_GITHUB_CONNECT.md

- 문서 버전: v1.2
- 작성일: 2026-04-24
- 상태: 완료
- 목적: Cloudflare Workers + GitHub 연동 설정 기록

## 1. 연동 완료 상태

| 항목 | 값 |
|---|---|
| 플랫폼 | Cloudflare Workers |
| 프로젝트명 | `note-editor` |
| GitHub 저장소 | `lietzsche/note-editor` |
| 프로덕션 브랜치 | `main` |

## 2. 빌드 구성

| 항목 | 값 |
|---|---|
| 빌드 명령 | 없음 |
| 배포 명령 | `npm run deploy` |
| 버전 업로드 명령 | `npx wrangler versions upload` |
| 루트 디렉터리 | `/` |

> `npm run deploy` = `npm run build && npx wrangler deploy`

## 3. 환경변수 및 시크릿

| 항목 | 등록 방법 | 상태 |
|---|---|---|
| `AUTH_SESSION_SECRET` | `npx wrangler secret put AUTH_SESSION_SECRET` | 완료 |
| `AUTH_SESSION_TTL_SECONDS` | 선택값, 기본 604800(7일) | 선택 |
| `ADMIN_USERNAMES` | `npx wrangler secret put ADMIN_USERNAMES` | 필요 시 |

`ADMIN_USERNAMES`는 쉼표로 구분한 운영자 username allowlist다.

## 4. D1 바인딩

| 항목 | 값 |
|---|---|
| Variable name | `DB` |
| database_name | `note-editor-db` |
| database_id | `c633c65e-4033-4ae7-ba5b-d753e1cb557e` |

## 5. 체크리스트

- [x] `package.json` 배포 명령 확인
- [x] `wrangler.toml` D1/asset 바인딩 확인
- [x] `AUTH_SESSION_SECRET` 등록 완료
- [x] D1 remote migration 적용 완료
- [x] 첫 정상 배포 완료
- [ ] `ADMIN_USERNAMES` 운영자 목록 등록 확인

## 6. 참고 문서

- Cloudflare Workers Git integration: <https://developers.cloudflare.com/workers/ci-cd/github-actions/>
- Cloudflare Workers Assets: <https://developers.cloudflare.com/workers/static-assets/>
- 배포 절차: `docs/operations/DEPLOY.md`
