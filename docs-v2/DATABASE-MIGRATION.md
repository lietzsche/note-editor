# D1 데이터베이스 마이그레이션 가이드

## 개요

이 문서는 노트 편집기 V2를 위한 Cloudflare D1 데이터베이스 마이그레이션 설정 및 관리 방법을 설명합니다. V1과 완전히 분리된 새로운 데이터베이스 인스턴스를 생성하고, 마이그레이션 스크립트를 통해 스키마와 초기 데이터를 설정합니다.

## 목표

1. V2 전용 D1 데이터베이스 생성 및 구성
2. 마이그레이션 시스템 설정
3. 스키마 버전 관리
4. 데이터 백업 및 복원 전략
5. 개발/스테이징/프로덕션 환경 분리

## 1단계: D1 데이터베이스 생성

### 1.1 Cloudflare 대시보드에서 생성
1. [Cloudflare Workers 대시보드](https://dash.cloudflare.com/) 접속
2. 왼쪽 메뉴에서 "Workers & Pages" 선택
3. "D1" 섹션으로 이동
4. "Create database" 버튼 클릭

### 1.2 데이터베이스 설정
```
데이터베이스 이름: note-editor-v2-db
지역: 서울 (ap-seoul) 또는 가장 가까운 지역
백업: 활성화 (권장)
백업 보존 기간: 30일 (무료 플랜 기본값)
```

### 1.3 데이터베이스 ID 확인
생성 후 데이터베이스 ID를 기록합니다. `wrangler.toml` 파일 구성에 필요합니다.
```
데이터베이스 ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 2단계: 마이그레이션 시스템 설정

### 2.1 마이그레이션 디렉토리 구조
```
migrations/
├── 0001_initial_schema.sql
├── 0002_admin_user.sql
├── 0003_public_note_support.sql
├── 0004_audit_log_enhancements.sql
└── README.md
```

### 2.2 Wrangler 구성
`wrangler.toml` 파일에 D1 바인딩 추가:
```toml
[[d1_databases]]
binding = "DB"
database_name = "note-editor-v2-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2.3 마이그레이션 명령어 스크립트
`package.json`에 스크립트 추가:
```json
{
  "scripts": {
    "db:migrate:local": "npx wrangler d1 migrations apply note-editor-v2-db --local",
    "db:migrate:remote": "npx wrangler d1 migrations apply note-editor-v2-db --remote",
    "db:create-migration": "npx wrangler d1 migrations create note-editor-v2-db",
    "db:list:local": "npx wrangler d1 migrations list note-editor-v2-db --local",
    "db:list:remote": "npx wrangler d1 migrations list note-editor-v2-db --remote",
    "db:backup": "npx wrangler d1 backup create note-editor-v2-db",
    "db:restore": "npx wrangler d1 backup restore note-editor-v2-db"
  }
}
```

## 3단계: 초기 마이그레이션 파일 작성

### 3.1 기본 스키마 마이그레이션
`migrations/0001_initial_schema.sql`:
```sql
-- 사용자 테이블 (사용자 정보 및 권한 관리)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user', 'admin'
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TEXT,
  password_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (role IN ('user', 'admin'))
);

-- 기본 사용자 인덱스
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 그룹 테이블 (노트 분류용)
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

-- 그룹 인덱스
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_position ON groups(position);

-- 노트 테이블 (핵심 데이터)
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- 공개 노트 기능 필드
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  public_token TEXT UNIQUE,
  public_view_count INTEGER NOT NULL DEFAULT 0,
  last_public_view_at TEXT,
  
  -- 버전 관리
  version INTEGER NOT NULL DEFAULT 1,
  
  -- 메타데이터
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 노트 인덱스
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_group_id ON pages(group_id);
CREATE INDEX IF NOT EXISTS idx_pages_sort_order ON pages(sort_order);
CREATE INDEX IF NOT EXISTS idx_pages_is_public ON pages(is_public);
CREATE INDEX IF NOT EXISTS idx_pages_public_token ON pages(public_token);

-- 세션 테이블 (인증 세션 관리)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 세션 인덱스
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 로그인 시도 테이블 (보안 및 속도 제한)
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  ip_address TEXT,
  successful BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 로그인 시도 인덱스
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- 감사 로그 테이블 (관리자 활동 기록)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'user_created', 'user_updated', 'password_reset', 'note_shared', etc.
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  target_username TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 감사 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 비밀번호 재설정 토큰 테이블
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 비밀번호 재설정 토큰 인덱스
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

### 3.2 관리자 사용자 초기화 마이그레이션
`migrations/0002_admin_user.sql`:
```sql
-- 관리자 사용자 생성 (초기 비밀번호: qwer135!)
-- bcrypt 해시 생성: https://bcrypt-generator.com/
INSERT OR IGNORE INTO users (id, username, password_hash, role, email)
VALUES (
  'admin-user-id-1234',
  'admin',
  -- 'qwer135!'의 bcrypt 해시 (cost: 10)
  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
  'admin',
  'admin@example.com'
);

-- 기본 그룹 생성 (관리자용)
INSERT OR IGNORE INTO groups (id, user_id, name, position, is_default)
VALUES 
  ('default-group-admin', 'admin-user-id-1234', '미분류', 0, TRUE),
  ('work-group-admin', 'admin-user-id-1234', '업무', 1, FALSE),
  ('personal-group-admin', 'admin-user-id-1234', '개인', 2, FALSE);

-- 감사 로그에 관리자 생성 기록
INSERT INTO audit_logs (id, event_type, user_id, username, details)
VALUES (
  'initial-admin-created',
  'admin_created',
  'admin-user-id-1234',
  'system',
  '시스템 초기화: 관리자 사용자 생성'
);
```

### 3.3 공개 노트 기능 마이그레이션
`migrations/0003_public_note_support.sql`:
```sql
-- 공개 노트 접근 로그 테이블
CREATE TABLE IF NOT EXISTS public_note_access_logs (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL,
  accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT
);

-- 공개 노트 접근 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_public_note_access_logs_page_id ON public_note_access_logs(page_id);
CREATE INDEX IF NOT EXISTS idx_public_note_access_logs_accessed_at ON public_note_access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_public_note_access_logs_public_token ON public_note_access_logs(public_token);

-- 공개 노트 통계 뷰
CREATE VIEW IF NOT EXISTS public_note_stats AS
SELECT 
  p.id as page_id,
  p.title,
  p.user_id,
  p.is_public,
  p.public_token,
  p.public_view_count,
  p.last_public_view_at,
  COUNT(pl.id) as total_accesses,
  MIN(pl.accessed_at) as first_access,
  MAX(pl.accessed_at) as last_access
FROM pages p
LEFT JOIN public_note_access_logs pl ON p.id = pl.page_id
WHERE p.is_public = TRUE
GROUP BY p.id;
```

## 4단계: 마이그레이션 실행

### 4.1 로컬 개발 환경
```bash
# 마이그레이션 적용
npm run db:migrate:local

# 적용 상태 확인
npm run db:list:local
```

### 4.2 원격 환경 (스테이징/프로덕션)
```bash
# 스테이징 환경 적용
npx wrangler d1 migrations apply note-editor-v2-db --remote --env staging

# 프로덕션 환경 적용  
npx wrangler d1 migrations apply note-editor-v2-db --remote --env production
```

### 4.3 새 마이그레이션 생성
```bash
# 새 마이그레이션 파일 생성
npm run db:create-migration

# 생성된 파일 편집
# migrations/000X_new_feature.sql
```

## 5단계: 데이터 백업 및 복원

### 5.1 수동 백업 생성
```bash
# 백업 생성
npm run db:backup

# 백업 목록 확인
npx wrangler d1 backup list note-editor-v2-db

# 백업 다운로드 (선택사항)
npx wrangler d1 backup download note-editor-v2-db --backup-id=BACKUP_ID
```

### 5.2 백업에서 복원
```bash
# 백업 목록 확인
npx wrangler d1 backup list note-editor-v2-db

# 특정 백업으로 복원
npm run db:restore -- --backup-id=BACKUP_ID
```

### 5.3 자동 백업 스케줄
Cloudflare D1은 자동으로 매일 백업을 생성합니다:
- 무료 플랜: 30일 보관
- 프로 플랜: 사용자 정의 보관 기간
- 백업은 동일 지역에 저장

## 6단계: 환경별 데이터베이스 구성

### 6.1 개발 환경
```toml
# wrangler.toml
[env.development]
[[d1_databases]]
binding = "DB"
database_name = "note-editor-v2-db-dev"
database_id = "dev-database-id-here"
```

### 6.2 스테이징 환경
```toml
[env.staging]
[[d1_databases]]
binding = "DB"
database_name = "note-editor-v2-db-staging"
database_id = "staging-database-id-here"
```

### 6.3 프로덕션 환경
```toml
[env.production]
[[d1_databases]]
binding = "DB"
database_name = "note-editor-v2-db"
database_id = "production-database-id-here"
```

## 7단계: 데이터 마이그레이션 (V1 → V2)

### 7.1 V1 데이터 내보내기
```sql
-- V1 데이터베이스에서 데이터 추출
-- users 테이블
SELECT * FROM users;

-- groups 테이블  
SELECT * FROM groups;

-- pages 테이블
SELECT * FROM pages;
```

### 7.2 V2 데이터 가져오기 스크립트
`scripts/migrate-v1-to-v2.js`:
```javascript
import { createClient } from '@libsql/client';

// V1 데이터베이스 연결 (기존)
const v1Client = createClient({
  url: 'file:v1-database.db'
});

// V2 데이터베이스 연결 (D1 - 로컬 시뮬레이션)
const v2Client = createClient({
  url: 'file:v2-database.db'
});

async function migrateUsers() {
  const v1Users = await v1Client.execute('SELECT * FROM users');
  
  for (const user of v1Users.rows) {
    // 역할 변환 (필요시)
    const role = user.username === 'admin' ? 'admin' : 'user';
    
    await v2Client.execute({
      sql: `INSERT INTO users (id, username, password_hash, role, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [user.id, user.username, user.password_hash, role, user.created_at, user.updated_at]
    });
  }
}

// 다른 테이블 마이그레이션 함수들...
```

### 7.3 마이그레이션 검증
```sql
-- 데이터 무결성 검증
SELECT 
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM groups) as group_count,
  (SELECT COUNT(*) FROM pages) as page_count,
  (SELECT COUNT(*) FROM pages WHERE is_public = TRUE) as public_note_count;
```

## 8단계: 문제 해결

### 일반적인 문제

#### 1. 마이그레이션 실패
```bash
# 마이그레이션 상태 확인
npx wrangler d1 migrations list note-editor-v2-db --local

# 특정 마이그레이션 건너뛰기 (위험)
npx wrangler d1 migrations apply note-editor-v2-db --local --skip-failed
```

#### 2. 데이터베이스 연결 오류
```bash
# 데이터베이스 정보 확인
npx wrangler d1 info note-editor-v2-db

# 바인딩 확인
npx wrangler d1 list
```

#### 3. 성능 문제
```sql
-- 느린 쿼리 분석
EXPLAIN QUERY PLAN
SELECT * FROM pages WHERE user_id = ? AND is_public = TRUE;

-- 인덱스 추가 (필요시)
CREATE INDEX IF NOT EXISTS idx_pages_user_public ON pages(user_id, is_public);
```

### 디버깅 도구
```bash
# D1 쿼리 로그 활성화
npx wrangler dev --log-level=debug

# 직접 쿼리 실행
npx wrangler d1 execute note-editor-v2-db --local --command="SELECT * FROM users LIMIT 5"
```

## 9단계: 모니터링 및 유지보수

### 9.1 데이터베이스 상태 모니터링
```sql
-- 테이블 크기 확인
SELECT 
  name as table_name,
  COUNT(*) as row_count
FROM sqlite_master 
WHERE type = 'table'
GROUP BY name
ORDER BY row_count DESC;

-- 인덱스 상태 확인
SELECT 
  name as index_name,
  tbl_name as table_name
FROM sqlite_master
WHERE type = 'index'
ORDER BY tbl_name, name;
```

### 9.2 정기 유지보수 작업
```sql
-- 오래된 세션 정리
DELETE FROM sessions WHERE expires_at < datetime('now');

-- 오래된 로그인 시도 기록 정리
DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-30 days');

-- 사용하지 않는 공개 토큰 정리
UPDATE pages SET public_token = NULL WHERE is_public = FALSE AND public_token IS NOT NULL;
```

## 다음 단계

1. `docs-v2/ADMIN-FEATURES.md` - 관리자 기능 구현
2. `docs-v2/PUBLIC-SHARING.md` - 노트 공유 기능 구현  
3. 실제 데이터 마이그레이션 테스트 수행
4. 성능 테스트 및 최적화

## 참고 자료

- [Cloudflare D1 문서](https://developers.cloudflare.com/d1/)
- [SQLite 문법 가이드](https://www.sqlite.org/lang.html)
- [마이그레이션 모범 사례](https://developers.cloudflare.com/d1/learning/migrations/)

## 업데이트 기록

- 2026-04-21: 초안 작성 완료
- 2026-04-21: V2 스키마 상세 추가
- 2026-04-21: 관리자 기능 관련 테이블 추가