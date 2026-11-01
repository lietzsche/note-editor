# DEPLOY.md

- 문서 버전: v1.2
- 작성일: 2026-04-11
- 수정일: 2026-11-01
- 목적: Cloudflare Workers + D1 배포 절차 표준화

관련 문서:
- GitHub 연동 설정: `docs/operations/CLOUDFLARE_GITHUB_CONNECT.md`

## 1. 전제

1. 서비스 요구사항: `docs/product/PRD.md` 확정
2. 테스트 기준: `docs/testing/TEST_PLAN.md` 준비
3. 인프라 스펙: `docs/specs/SPEC-01`, `SPEC-02` 반영

## 2. 사전 점검

1. 프로젝트/DB 확정값
- 프로젝트명: `note-editor`
- Cloudflare 계정: `stxtory@gmail.com` (`7b3dcb1ab75d22c7ef4254754ac4a68e`)
- 운영 URL: `https://note.lietzsche.org`
- D1 DB명: `note-editor-db`
- D1 database_id: `c633c65e-4033-4ae7-ba5b-d753e1cb557e`

2. 배포 전 점검
- `wrangler.toml` 바인딩 확인
- `package.json` deploy 스크립트 확인
- 마이그레이션 파일 최신 상태 확인
- `npm run verify` 게이트 통과 확인

3. 로컬 통합 모드 사전 확인
- `npm run dev` 실행 후 `http://localhost:8788` 접속 확인
- 로그인/노트 생성/API 호출 최소 스모크 확인

## 3. 시크릿 설정

```bash
npx wrangler secret put AUTH_SESSION_SECRET
# 입력 프롬프트에 32자 이상 임의 문자열 입력

# 선택: 세션 TTL 변경 시 (기본 604800 = 7일)
npx wrangler secret put AUTH_SESSION_TTL_SECONDS

# 운영자 username allowlist (예: admin,ops_lead)
npx wrangler secret put ADMIN_USERNAMES
```

## 4. D1 스키마 반영 (Migration Framework)

```bash
npm run migrate:list:remote
npm run migrate:apply:remote
```

원칙:
- 원격 스키마 변경은 `wrangler d1 migrations` 기반으로만 수행한다.
- 기존 프로젝트 데이터 이전은 수행하지 않는다.

## 5. 빌드/배포

```bash
npm install
npm run deploy
```

> `npm run deploy` = `npm run build && npx wrangler deploy`

`wrangler.toml`의 `routes`에 `note.lietzsche.org`를 `custom_domain = true`로
등록한다. 도메인과 Worker는 위 계정에 있으며, Cloudflare가 DNS와 HTTPS
인증서를 관리한다. 이후 배포도 같은 계정과 도메인 설정을 사용한다.

2026-11-01에는 기존 운영 Worker에 Custom Domain을 연결했다.
도메인 연결을 위해 앱 코드를 새로 배포하거나 D1 데이터를 변경하지 않았다.
기존 주소의 브라우저 로그인과 로컬 저장 상태는 새 도메인으로 자동 이전되지
않으므로, 새 주소에서 다시 로그인한다.

배포 결과 URL, 시각, 담당자 기록.

## 6. 배포 직후 검증

1. 필수 스모크: `docs/testing/TEST_PLAN.md`의 TS-01, TS-02, TS-04, TS-05, TS-07, TS-08, TS-10, TS-11 우선 실행
2. 확장 회귀: TS-09(충돌 처리)는 릴리스 윈도우 내 추가 수행
3. 필수 스모크 실패 시 배포 승인 보류
4. 보안 확인: 쿠키 보안 속성(`HttpOnly`, `SameSite`, 운영환경 `Secure`) 점검
5. 운영 확인: 인증 이벤트 로그(로그인 성공/실패/로그아웃) 수집 여부 점검

## 7. 장애 대응

1. 마지막 정상 배포로 즉시 복구
2. 원인 분석 후 재배포 일정 확정
3. 장애 기록(원인/영향/조치) 문서화
