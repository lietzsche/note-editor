# V2 개발 시작 가이드

## 개요

이 문서는 노트 편집기 V2 프로젝트를 처음부터 시작하기 위한 완전한 가이드입니다. V1 코드베이스와 완전히 독립된 새 프로젝트로 시작하며, Cloudflare에 새 프로젝트를 생성하고 `v2` 브랜치에서 개발합니다.

## 사전 준비사항

### 필수 도구
- Node.js 18 이상
- npm 또는 yarn
- Git
- Cloudflare 계정 (workers 권한 필요)
- Wrangler CLI (`npm install -g wrangler`)

### 권장 개발 환경
- Visual Studio Code
- Git 클라이언트 (GitHub Desktop, SourceTree 등)
- 브라우저 개발자 도구

## 1단계: 저장소 복제 및 브랜치 생성

### 1.1 저장소 복제
```bash
git clone https://github.com/lietzsche/note-editor.git
cd note-editor
```

### 1.2 v2 브랜치 생성
```bash
git checkout -b v2
git push -u origin v2
```

### 1.3 작업 디렉토리 정리
```bash
# 필요에 따라 V1 관련 파일 정리 (선택사항)
# 이 단계는 V2를 완전히 새로 시작할 때만 수행
```

## 2단계: Cloudflare 새 프로젝트 생성

### 2.1 Cloudflare 대시보드 접속
1. [Cloudflare Workers 대시보드](https://dash.cloudflare.com/) 로그인
2. "Workers & Pages" 섹션으로 이동

### 2.2 새 프로젝트 생성
1. "Create application" 클릭
2. "Create Worker" 선택
3. 프로젝트 이름 입력: `note-editor-v2`
4. 기본 설정 사용

### 2.3 D1 데이터베이스 생성
1. Workers & Pages 대시보드에서 "D1" 선택
2. "Create database" 클릭
3. 데이터베이스 이름: `note-editor-v2-db`
4. 지역 선택: 가장 가까운 지역
5. "Create" 클릭

### 2.4 환경 변수 설정
1. 생성한 Worker에서 "Settings" > "Variables" 이동
2. 환경 변수 추가:
   - `DB`: D1 데이터베이스 바인딩 (자동 생성됨)
   - `SESSION_SECRET`: 세션 암호화 키 (랜덤 문자열)
   - `ADMIN_USERNAME`: 관리자 사용자명 (예: `admin`)
   - `ADMIN_PASSWORD`: 관리자 초기 비밀번호

## 3단계: 로컬 개발 환경 구성

### 3.1 패키지 설치
```bash
# package.json이 있는 경우
npm install

# 또는 새로 생성
npm init -y
npm install hono @cloudflare/workers-types wrangler
npm install -D typescript @types/node
```

### 3.2 Wrangler 구성
`wrangler.toml` 파일 생성:
```toml
name = "note-editor-v2"
compatibility_date = "2026-04-21"
main = "functions/api/index.ts"

[[d1_databases]]
binding = "DB"
database_name = "note-editor-v2-db"
database_id = "YOUR_DATABASE_ID_HERE"

[vars]
SESSION_SECRET = "your-session-secret-key-here"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "qwer135!"
```

### 3.3 TypeScript 구성
`tsconfig.json` 파일 생성:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "outDir": "./dist"
  },
  "include": ["functions/**/*"],
  "exclude": ["node_modules"]
}
```

## 4단계: 데이터베이스 마이그레이션 설정

### 4.1 마이그레이션 디렉토리 생성
```bash
mkdir -p migrations
```

### 4.2 초기 마이그레이션 파일 생성
`migrations/0001_initial.sql`:
```sql
-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' 또는 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 그룹 테이블
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

-- 노트 테이블
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  public_token TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 세션 테이블
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 로그인 시도 테이블
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 감사 로그 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  username TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.3 관리자 사용자 초기화 스크립트
`migrations/0002_admin_user.sql`:
```sql
-- 관리자 사용자 생성 (비밀번호: qwer135!)
INSERT OR IGNORE INTO users (id, username, password_hash, role)
VALUES (
  'admin-user-id',
  'admin',
  -- 'qwer135!'의 bcrypt 해시 (cost: 10)
  '$2b$10$YourBcryptHashHere',
  'admin'
);
```

## 5단계: 개발 서버 실행

### 5.1 로컬 개발 서버 시작
```bash
# 마이그레이션 적용
npx wrangler d1 migrations apply note-editor-v2-db --local

# 개발 서버 시작
npx wrangler dev
```

### 5.2 테스트
1. 브라우저에서 `http://localhost:8788` 접속
2. API 엔드포인트 테스트:
   - `GET /api/health` - 서버 상태 확인
   - `POST /api/auth/signup` - 회원가입 테스트
   - `POST /api/auth/login` - 로그인 테스트

## 6단계: 프론트엔드 설정

### 6.1 React 프로젝트 설정
```bash
# 프론트엔드 디렉토리 생성
mkdir -p src
cd src

# Vite로 React 프로젝트 생성
npm create vite@latest . -- --template react-ts
npm install

# 필요한 의존성 설치
npm install react-router-dom
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 6.2 환경 변수 설정
`.env.development`:
```env
VITE_API_URL=http://localhost:8788
VITE_APP_NAME=Note Editor V2
```

## 7단계: 개발 워크플로우

### 7.1 일일 작업 흐름
1. 최신 변경사항 가져오기: `git pull origin v2`
2. 브랜치 생성: `git checkout -b feature/기능명`
3. 개발 및 테스트
4. 커밋: `git commit -m "설명"`
5. 푸시: `git push origin feature/기능명`
6. PR 생성 및 코드 리뷰

### 7.2 테스트 실행
```bash
# 단위 테스트
npm run test:unit

# 통합 테스트
npm run test:integration

# 전체 테스트
npm run test
```

### 7.3 빌드 및 배포
```bash
# 프론트엔드 빌드
npm run build

# Cloudflare에 배포
npx wrangler deploy
```

## 문제 해결

### 일반적인 문제
1. **D1 연결 실패**: `wrangler.toml`의 database_id 확인
2. **마이그레이션 오류**: SQL 문법 확인, D1 콘솔에서 직접 실행
3. **환경 변수 누락**: `wrangler.toml`의 vars 섹션 확인
4. **CORS 문제**: API 응답 헤더에 CORS 헤더 추가

### 디버깅 도구
- Wrangler 로그: `npx wrangler tail`
- D1 쿼리 로그: 개발자 콘솔에서 확인
- 네트워크 요청: 브라우저 개발자 도구

## 다음 단계

1. `docs-v2/BRANCH-STRATEGY.md` 읽기 - 브랜치 전략 이해
2. `docs-v2/PROJECT-SETUP.md` 읽기 - 프로젝트 설정 상세
3. `docs-v2/product/PRD-V2.md` 읽기 - 제품 요구사항 확인
4. 첫 번째 기능 구현 시작

## 지원 및 문의

- 기술 이슈: GitHub Issues 사용
- 문서 개선: PR 제출
- 긴급 문의: [연락처 정보]

## 업데이트 기록

- 2026-04-21: 초안 작성 완료
- 2026-04-21: Cloudflare 설정 단계 추가
- 2026-04-21: 데이터베이스 마이그레이션 가이드 추가