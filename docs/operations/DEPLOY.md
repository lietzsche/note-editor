# DEPLOY.md

- 문서 버전: v1.0
- 작성일: 2026-04-11
- 목적: 신규 Cloudflare Pages + D1 배포 절차 표준화

관련 문서:
- GitHub 연동만 먼저 진행하는 경우: `docs/operations/CLOUDFLARE_GITHUB_CONNECT.md`

## 1. 전제

1. 서비스 요구사항: `docs/product/PRD.md` 확정
2. 테스트 기준: `docs/testing/TEST_PLAN.md` 준비
3. 인프라 스펙: `docs/specs/SPEC-01`, `SPEC-02` 반영

## 2. 사전 점검

1. 프로젝트/DB 플레이스홀더 확정
- `<NEW_PAGES_PROJECT_NAME>`
- `<NEW_D1_DB_NAME>`
- `<NEW_D1_DB_ID>`

2. 배포 전 점검
- `wrangler.toml` 바인딩 확인
- `package.json` deploy 대상 프로젝트 확인
- 마이그레이션 파일 최신 상태 확인

3. 로컬 통합 모드 사전 확인
- `npm run dev` 실행 후 `http://localhost:8788` 접속 확인
- 로그인/노트 생성/API 호출 최소 스모크 확인

## 3. 시크릿 설정

```bash
npx wrangler pages secret put AUTH_PASSWORD --project-name <NEW_PAGES_PROJECT_NAME>
npx wrangler pages secret put AUTH_SESSION_SECRET --project-name <NEW_PAGES_PROJECT_NAME>
npx wrangler pages secret put AUTH_SESSION_TTL_SECONDS --project-name <NEW_PAGES_PROJECT_NAME>
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
npm run build
npx wrangler pages deploy build/ --project-name <NEW_PAGES_PROJECT_NAME>
```

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
