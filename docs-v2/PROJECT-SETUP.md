# Cloudflare 새 프로젝트 설정 가이드

## 개요

이 문서는 노트 편집기 V2를 위한 완전히 새로운 Cloudflare 프로젝트를 설정하는 방법을 설명합니다. V1 프로젝트와 독립적으로 운영되며, 별도의 D1 데이터베이스, Workers, 환경 변수를 사용합니다.

## 목표

1. V2 전용 Cloudflare Worker 프로젝트 생성
2. V2 전용 D1 데이터베이스 생성 및 구성
3. 환경 변수 및 보안 설정
4. GitHub 리포지토리와의 연동 설정
5. 개발/스테이징/프로덕션 환경 구성

## 1단계: Cloudflare 계정 준비

### 1.1 Cloudflare 계정 확인
- [Cloudflare 대시보드](https://dash.cloudflare.com/)에 로그인
- Workers 플랜 확인 (무료 플랜으로도 시작 가능)
- 결제 수단 등록 (필요시)

### 1.2 필요한 권한
- Workers 생성 및 관리 권한
- D1 데이터베이스 생성 권한
- 환경 변수 설정 권한
- 커스텀 도메인 설정 권한 (선택사항)

## 2단계: 새 Worker 프로젝트 생성

### 2.1 대시보드에서 생성
1. Cloudflare 대시보드 접속
2. 왼쪽 메뉴에서 "Workers & Pages" 선택
3. "Create application" 버튼 클릭
4. "Create Worker" 선택

### 2.2 프로젝트 설정
```
프로젝트 이름: note-editor-v2
설정:
  - JavaScript 런타임: 기본값 유지
  - 호환성 날짜: 2026-04-21 (최신 권장)
  - 지역: 가장 가까운 지역 선택 (예: 서울)
```

### 2.3 초기 코드 설정
기본 코드는 나중에 대체할 것이므로 간단한 테스트 코드로 시작:
```javascript
export default {
  async fetch(request, env) {
    return new Response('Note Editor V2 API 준비 중', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};
```

## 3단계: D1 데이터베이스 생성

### 3.1 데이터베이스 생성
1. Workers & Pages 대시보드에서 "D1" 선택
2. "Create database" 버튼 클릭
3. 데이터베이스 설정:
   ```
   데이터베이스 이름: note-editor-v2-db
   지역: 동일 지역 선택
   백업: 활성화 (권장)
   백업 보존 기간: 30일 (기본값)
   ```

### 3.2 데이터베이스 ID 확인
생성 후 데이터베이스 ID를 기록합니다. `wrangler.toml` 구성에 필요합니다.

## 4단계: 환경 변수 설정

### 4.1 Worker 환경 변수 추가
1. 생성한 Worker에서 "Settings" 탭 선택
2. "Variables" 섹션으로 이동
3. 환경 변수 추가:

#### 필수 변수
```
SESSION_SECRET: [랜덤 32자 이상 문자열]
ADMIN_USERNAME: admin
ADMIN_PASSWORD: qwer135!
JWT_SECRET: [랜덤 32자 이상 문자열]
```

#### 선택적 변수
```
APP_ENV: development (또는 production)
CORS_ORIGIN: https://your-domain.com
LOG_LEVEL: info
```

### 4.2 보안 고려사항
1. `SESSION_SECRET`과 `JWT_SECRET`은 서로 다르게 생성
2. 프로덕션 환경에서는 더 긴 시크릿 키 사용 (64자 이상)
3. 정기적으로 시크릿 키 교체 계획 수립

## 5단계: 로컬 개발 환경 구성

### 5.1 Wrangler CLI 설치
```bash
npm install -g wrangler
```

### 5.2 Wrangler 로그인
```bash
npx wrangler login
```

### 5.3 프로젝트 구성 파일 생성
`wrangler.toml` 파일:
```toml
name = "note-editor-v2"
compatibility_date = "2026-04-21"
main = "functions/api/index.ts"
compatibility_flags = ["nodejs_compat"]

# D1 데이터베이스 바인딩
[[d1_databases]]
binding = "DB"
database_name = "note-editor-v2-db"
database_id = "YOUR_DATABASE_ID_HERE"

# 환경 변수 (로컬 개발용)
[vars]
SESSION_SECRET = "local-development-secret-key-here"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "qwer135!"
APP_ENV = "development"

# 개발 환경 설정
[env.development]
vars = { APP_ENV = "development" }

# 프로덕션 환경 설정
[env.production]
vars = { APP_ENV = "production" }
```

### 5.4 데이터베이스 마이그레이션 설정
```bash
# 마이그레이션 디렉토리 생성
mkdir -p migrations

# 초기 마이그레이션 파일 생성
cat > migrations/0001_initial.sql << 'EOF'
-- 초기 데이터베이스 스키마
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- ... 나머지 테이블 정의
EOF
```

## 6단계: GitHub 연동 설정

### 6.1 GitHub Actions 워크플로우 생성
`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [v2]
  pull_request:
    branches: [v2]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
      
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Deploy to Cloudflare
      if: github.ref == 'refs/heads/v2'
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        command: deploy
        environment: production
```

### 6.2 GitHub Secrets 설정
GitHub 리포지토리 Settings > Secrets and variables > Actions:
```
CLOUDFLARE_API_TOKEN: Cloudflare API 토큰
CLOUDFLARE_ACCOUNT_ID: Cloudflare 계정 ID
```

## 7단계: 도메인 및 SSL 설정

### 7.1 커스텀 도메인 연결 (선택사항)
1. Worker 설정에서 "Triggers" 탭 선택
2. "Custom Domains" 섹션에서 "Add Custom Domain"
3. 도메인 입력 (예: api-v2.your-domain.com)
4. DNS 설정 자동으로 구성

### 7.2 SSL 인증서
- Cloudflare에서 자동으로 관리
- 항상 HTTPS 사용 권장
- HSTS 설정 고려

## 8단계: 모니터링 및 로깅 설정

### 8.1 Cloudflare Analytics 활성화
1. Worker 대시보드에서 "Analytics" 탭 확인
2. 기본적으로 활성화됨

### 8.2 사용자 정의 로깅
```javascript
// API 코드 예시
const log = {
  info: (message, data) => console.log(JSON.stringify({ 
    level: 'info', 
    message, 
    data,
    timestamp: new Date().toISOString() 
  })),
  error: (message, error) => console.error(JSON.stringify({
    level: 'error',
    message,
    error: error?.message,
    stack: error?.stack,
    timestamp: new Date().toISOString()
  }))
};
```

## 9단계: 백업 및 재해 복구

### 9.1 D1 데이터베이스 백업
```bash
# 수동 백업 생성
npx wrangler d1 backup create note-editor-v2-db

# 백업 목록 확인
npx wrangler d1 backup list note-editor-v2-db

# 백업에서 복원
npx wrangler d1 backup restore note-editor-v2-db --backup-id=ID
```

### 9.2 자동 백업 설정
Cloudflare D1은 기본적으로 자동 백업을 제공합니다:
- 매일 자동 백업
- 30일간 보관 (무료 플랜)
- 수동 백업 추가 가능

## 10단계: 테스트 및 검증

### 10.1 로컬 테스트
```bash
# 로컬 개발 서버 시작
npx wrangler dev

# 마이그레이션 적용
npx wrangler d1 migrations apply note-ediler-v2-db --local

# API 테스트
curl http://localhost:8788/api/health
```

### 10.2 원격 배포 테스트
```bash
# 스테이징 환경에 배포
npx wrangler deploy --env staging

# 프로덕션 환경에 배포
npx wrangler deploy --env production
```

## 문제 해결

### 일반적인 문제

#### 1. D1 연결 실패
```bash
# 데이터베이스 ID 확인
npx wrangler d1 list

# 바인딩 확인
npx wrangler d1 info note-editor-v2-db
```

#### 2. 환경 변수 누락
- `wrangler.toml` 파일 확인
- Cloudflare 대시보드에서 환경 변수 확인
- 로컬 `.dev.vars` 파일 사용 (개발용)

#### 3. CORS 문제
API 응답에 CORS 헤더 추가:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};
```

## 다음 단계

1. `docs-v2/BRANCH-STRATEGY.md` - 브랜치 관리 전략
2. `docs-v2/DATABASE-MIGRATION.md` - 데이터 마이그레이션 가이드
3. `docs-v2/ADMIN-FEATURES.md` - 관리자 기능 구현
4. `docs-v2/PUBLIC-SHARING.md` - 노트 공유 기능 구현

## 업데이트 기록

- 2026-04-21: 초안 작성 완료
- 2026-04-21: D1 설정 상세 추가
- 2026-04-21: GitHub 연동 가이드 추가