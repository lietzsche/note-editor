# Repository Guidelines

## 프로젝트 구조 및 모듈 구성

이 저장소는 Vite + React + TypeScript 기반 노트 편집기이며 Cloudflare Pages Functions를 사용합니다.

- `src/`는 클라이언트 앱입니다. UI 컴포넌트는 `src/components/`, 라우트 단위 페이지와 훅은 `src/pages/`, 공통 로직은 `src/lib/`, CSS 토큰과 전역 스타일은 `src/styles/`와 `src/index.css`에 둡니다.
- `functions/api/`는 Cloudflare Functions API 엔드포인트입니다. 공통 API 헬퍼는 `functions/api/_lib/`에 둡니다.
- `tests/`는 Vitest 테스트입니다. Worker/API 통합 테스트는 `tests/api/`, 단위 및 React 테스트는 `tests/` 바로 아래에 둡니다.
- `migrations/`와 `schema.sql`은 D1 스키마를 정의합니다. 정적 PWA 자산은 `public/`, 빌드 결과물은 `build/`에 생성됩니다.
- `docs/`에는 제품, 설계, 운영, 테스트 문서를 보관합니다.

## 빌드, 테스트, 개발 명령

- `npm run dev`: 한 번 빌드한 뒤 `wrangler dev`를 포트 `8788`에서 실행합니다.
- `npm run dev:watch`: Vite 빌드를 감시하면서 Wrangler 로컬 서버를 실행합니다.
- `npm run build`: Vite 프로덕션 빌드를 `build/`에 생성합니다.
- `npm run typecheck`: 파일을 생성하지 않고 엄격한 TypeScript 검사를 실행합니다.
- `npm run test:unit`: `vitest.unit.config.ts`로 비 API 테스트를 실행합니다.
- `npm run test:integration`: 빌드 후 `tests/api/`의 Cloudflare Workers 테스트를 실행합니다.
- `npm run verify`: CI와 동일하게 typecheck 및 전체 테스트를 실행합니다.

## 코딩 스타일 및 명명 규칙

TypeScript strict 설정을 기준으로 작성합니다. 기존 코드처럼 들여쓰기는 공백 2칸, import와 문자열은 큰따옴표, 문장 끝에는 세미콜론을 사용합니다. 재사용 모듈은 named export를 우선합니다. React 컴포넌트 파일은 `CopyAllButton.tsx`처럼 `PascalCase`, 유틸리티와 훅은 `noteOrder.ts`, `useNotesData.ts`처럼 `camelCase`를 사용합니다. 순수 도메인 로직은 렌더링 없이 테스트할 수 있도록 `src/lib/`에 분리합니다.

## 테스트 지침

테스트 프레임워크는 Vitest입니다. 테스트 파일명은 `*.test.ts` 또는 `*.test.tsx`를 사용합니다. 기능별 단위 테스트는 `tests/`에 추가하고, Cloudflare Function/API 검증은 `tests/api/`에 둡니다. 넓은 통합 테스트를 늘리기 전에 `src/lib/`의 추출 로직이나 페이지 훅을 먼저 테스트합니다. PR 전에는 `npm run verify`를 실행합니다.

## 커밋 및 Pull Request 지침

최근 커밋은 한국어 중심의 짧고 설명적인 제목을 사용하며, 훅 분리나 테스트 추가처럼 하나의 변경에 집중합니다. 커밋은 범위를 작게 유지하고 동작 중심으로 작성합니다. PR에는 변경 설명, 테스트 결과(`npm run verify`), 관련 이슈나 백로그 항목, UI 변경 시 스크린샷을 포함합니다.

## Codex Skill 체인 가이드

이 저장소의 Codex skill 목록, 사용 예시, 상황별 체인 명령어는 `.agents/README.md`를 기준 문서로 사용합니다. 여러 skill을 조합해 기획, 디자인, 코드 리뷰, 반영, QA를 한 번에 요청할 때는 해당 문서의 체인 명령어 섹션을 따릅니다.

## 보안 및 설정 팁

실제 비밀값은 커밋하지 않습니다. `.dev.vars.example`을 템플릿으로 사용하고 로컬 값은 `.dev.vars`에만 둡니다. 데이터베이스 변경은 `npm run migrate:create`로 마이그레이션을 만들고, 원격 배포 전에 로컬 적용을 먼저 확인합니다.
