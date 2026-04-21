# 노트 편집기 V2 (Note Editor V2)

## 개요

노트 편집기 V2는 Cloudflare Workers와 D1 데이터베이스를 기반으로 하는 모던한 웹 기반 노트 애플리케이션입니다. V1의 핵심 기능을 유지하면서 관리자 기능, 노트 공유, PWA 지원 등 새로운 기능을 추가합니다.

## 주요 기능

### ✅ 구현 예정 기능
- **사용자 인증**: 회원가입, 로그인, 세션 관리
- **노트 관리**: 생성, 수정, 삭제, 검색
- **그룹 관리**: 노트 분류 및 드래그 앤 드롭 정렬
- **공개 노트**: 읽기 전용 공개 URL 생성 및 공유
- **관리자 기능**: 사용자 관리, 비밀번호 초기화, 시스템 모니터링
- **PWA 지원**: 오프라인 동작 및 앱 설치

### 🚀 기술 스택
- **프론트엔드**: React 18, TypeScript, Vite
- **백엔드**: Hono (Cloudflare Workers)
- **데이터베이스**: Cloudflare D1 (SQLite)
- **인프라**: Cloudflare Workers, Pages
- **스타일링**: CSS Modules, 디자인 토큰
- **테스트**: Vitest, Cloudflare Workers 테스트 환경

## 시작하기

### 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn
- Cloudflare 계정
- Wrangler CLI (`npm install -g wrangler`)

### 설치 및 실행
```bash
# 저장소 복제
git clone https://github.com/lietzsche/note-editor.git
cd note-editor

# V2 브랜치로 전환
git checkout v2-init

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

자세한 설정 방법은 [docs-v2/GETTING-STARTED.md](docs-v2/GETTING-STARTED.md) 문서를 참고하세요.

## 프로젝트 구조

```
note-editor/
├── docs-v2/                    # V2 문서
│   ├── GETTING-STARTED.md      # 시작 가이드
│   ├── PROJECT-SETUP.md        # Cloudflare 설정
│   ├── BRANCH-STRATEGY.md      # 브랜치 전략
│   ├── DATABASE-MIGRATION.md   # 데이터베이스 마이그레이션
│   ├── ADMIN-FEATURES.md       # 관리자 기능
│   ├── PUBLIC-SHARING.md       # 노트 공유 기능
│   └── DEVELOPMENT-ROADMAP.md  # 개발 로드맵
├── src/                        # 프론트엔드 소스
│   ├── components/             # React 컴포넌트
│   ├── pages/                  # 페이지 컴포넌트
│   ├── lib/                    # 유틸리티 함수
│   └── styles/                 # 스타일시트
├── functions/                  # Cloudflare Workers 함수
│   └── api/                    # API 엔드포인트
├── migrations/                 # 데이터베이스 마이그레이션
├── public/                     # 정적 파일
└── tests/                      # 테스트 파일
```

## 개발 가이드

### 브랜치 전략
V2 개발은 `v2-init` 브랜치에서 시작합니다. 자세한 브랜치 전략은 [docs-v2/BRANCH-STRATEGY.md](docs-v2/BRANCH-STRATEGY.md)를 참고하세요.

### 커밋 규칙
```
타입: 제목 (50자 이내)

본문 (선택사항, 72자마다 줄바꿈)

- 변경 사항 상세 설명
- 이유 설명 (필요시)

꼬리말 (선택사항):
Fixes #이슈번호
Refs #관련이슈
```

타입 목록: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 코드 스타일
- TypeScript 엄격 모드 사용
- ESLint와 Prettier로 코드 포맷팅
- 컴포넌트는 함수형 컴포넌트 사용
- API 응답은 표준화된 형식으로 통일

## 배포

### Cloudflare 설정
1. Cloudflare Workers 프로젝트 생성 (`note-editor-v2`)
2. D1 데이터베이스 생성 (`note-editor-v2-db`)
3. 환경 변수 설정

자세한 내용은 [docs-v2/PROJECT-SETUP.md](docs-v2/PROJECT-SETUP.md)를 참고하세요.

### 배포 명령어
```bash
# 개발 환경 빌드
npm run build

# 로컬 테스트
npm run dev

# Cloudflare에 배포
npm run deploy
```

## 문서

V2 개발에 대한 상세 문서는 `docs-v2/` 디렉토리에서 확인할 수 있습니다:

1. [시작 가이드](docs-v2/GETTING-STARTED.md) - V2 개발 환경 설정
2. [프로젝트 설정](docs-v2/PROJECT-SETUP.md) - Cloudflare 구성
3. [브랜치 전략](docs-v2/BRANCH-STRATEGY.md) - Git 워크플로우
4. [데이터베이스 마이그레이션](docs-v2/DATABASE-MIGRATION.md) - D1 스키마 관리
5. [관리자 기능](docs-v2/ADMIN-FEATURES.md) - 관리자 인터페이스
6. [노트 공유 기능](docs-v2/PUBLIC-SHARING.md) - 공개 URL 시스템
7. [개발 로드맵](docs-v2/DEVELOPMENT-ROADMAP.md) - 프로젝트 일정

## 기여하기

1. Issue 생성 또는 기존 Issue 확인
2. 기능 브랜치 생성 (`feature/기능명`)
3. 코드 작성 및 테스트
4. Pull Request 생성
5. 코드 리뷰 및 병합

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 지원

- 버그 리포트: GitHub Issues
- 기능 제안: GitHub Discussions
- 기술 문서: `docs-v2/` 디렉토리

---

*프로젝트 버전: v2.0.0-alpha*
*최종 업데이트: 2026-04-21*