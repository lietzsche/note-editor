# V2 브랜치 전략 및 작업 흐름

## 개요

이 문서는 노트 편집기 V2 프로젝트의 Git 브랜치 관리 전략과 개발 워크플로우를 정의합니다. V2는 `v2` 브랜치를 메인 브랜치로 사용하며, 기능 브랜치, 릴리스 브랜치, 핫픽스 브랜치를 체계적으로 관리합니다.

## 브랜치 구조

### 주요 브랜치
```
v2                    - 메인 개발 브랜치 (항상 배포 가능 상태 유지)
├── feature/*         - 기능 개발 브랜치
├── bugfix/*          - 버그 수정 브랜치  
├── release/*         - 릴리스 준비 브랜치
└── hotfix/*          - 긴급 수정 브랜치
```

### 브랜치 명명 규칙
```
feature/기능-이름       예: feature/public-note-sharing
bugfix/문제-설명        예: bugfix/login-error-500
release/버전-번호       예: release/v2.1.0
hotfix/긴급-수정        예: hotfix/security-fix
```

## 개발 워크플로우

### 1. 기능 개발 (Feature Development)

#### 1.1 브랜치 생성
```bash
# v2 브랜치에서 시작
git checkout v2
git pull origin v2

# 기능 브랜치 생성
git checkout -b feature/public-note-sharing
```

#### 1.2 개발 작업
1. 작은 단위로 커밋 (하나의 커밋 = 하나의 논리적 변경)
2. 커밋 메시지 규칙 준수
3. 로컬에서 테스트 수행

#### 1.3 커밋 메시지 규칙
```
타입: 제목 (50자 이내)

본문 (선택사항, 72자마다 줄바꿈)

- 변경 사항 상세 설명
- 이유 설명 (필요시)

꼬리말 (선택사항):
Fixes #이슈번호
Refs #관련이슈
```

타입 목록:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스, 도구 변경

예시:
```
feat: 노트 공개 URL 기능 추가

- 노트 공개/비공개 전환 API 구현
- 공개 URL 생성 및 접근 제어 로직 추가
- 관리자 인터페이스에서 공개 노트 관리 기능

Fixes #45
```

#### 1.4 푸시 및 PR 생성
```bash
# 브랜치 푸시
git push -u origin feature/public-note-sharing

# GitHub에서 Pull Request 생성
# 대상 브랜치: v2
```

### 2. 코드 리뷰 및 병합

#### 2.1 PR 체크리스트
- [ ] 코드 스타일 가이드 준수
- [ ] 테스트 작성 및 통과
- [ ] 문서 업데이트
- [ ] 타입 체크 통과
- [ ] 빌드 성공
- [ ] 변경 사항 설명 완료

#### 2.2 리뷰 프로세스
1. 최소 1명의 리뷰어 승인 필요
2. CI/CD 파이프라인 통과 필수
3. 충돌 해결 후 병합

#### 2.3 병합 방법
```bash
# v2 브랜치로 리베이스 병합 (권장)
git checkout v2
git pull origin v2
git checkout feature/public-note-sharing
git rebase v2
git checkout v2
git merge --no-ff feature/public-note-sharing
git push origin v2

# 또는 GitHub의 Squash and Merge 사용
```

### 3. 릴리스 프로세스

#### 3.1 릴리스 브랜치 생성
```bash
git checkout v2
git pull origin v2
git checkout -b release/v2.1.0
```

#### 3.2 릴리스 준비
1. 버전 번호 업데이트 (`package.json`, `wrangler.toml`)
2. 변경 로그 작성 (`CHANGELOG.md`)
3. 최종 테스트 수행
4. 문서 업데이트 확인

#### 3.3 태그 생성 및 배포
```bash
# 릴리스 브랜치 병합
git checkout v2
git merge --no-ff release/v2.1.0

# 태그 생성
git tag -a v2.1.0 -m "Release v2.1.0: 노트 공유 기능 추가"
git push origin v2.1.0

# 배포
npm run deploy
```

### 4. 긴급 수정 (Hotfix)

#### 4.1 핫픽스 브랜치 생성
```bash
# 최신 릴리스 태그에서 브랜치
git checkout -b hotfix/security-fix v2.1.0
```

#### 4.2 수정 및 배포
1. 긴급 수정 사항 처리
2. 테스트 수행
3. v2 브랜치와 릴리스 브랜치에 병합
4. 새 버전 태그 생성

```bash
# v2 브랜치에 병합
git checkout v2
git merge --no-ff hotfix/security-fix

# 새 버전 태그
git tag -a v2.1.1 -m "Hotfix v2.1.1: 보안 취약점 수정"
```

## V2 특별 전략

### V1과의 완전한 분리
- `v2` 브랜치는 `main` 브랜치와 완전히 독립
- 별도의 Cloudflare 프로젝트, 데이터베이스, 환경 변수
- 병합은 단방향만 (v2 → main은 없음)

### 초기 설정 브랜치
```
v2-setup/cloudflare-config    - Cloudflare 설정
v2-setup/database-schema      - 데이터베이스 스키마
v2-setup/ci-cd-pipeline      - CI/CD 파이프라인
```

### 개발 단계별 브랜치 전략
```
Phase 1: v2-setup/*           - 환경 설정
Phase 2: feature/auth-v2      - 인증 시스템 재구현
Phase 3: feature/core-v2      - 코어 기능 재구현
Phase 4: feature/admin        - 관리자 기능
Phase 5: feature/sharing      - 노트 공유 기능
```

## Git 설정 및 도구

### .gitignore 설정
```
# 환경 변수
.env
.env.local
.env.development
.env.production

# 빌드 출력
dist/
build/
node_modules/

# IDE 설정
.vscode/
.idea/

# 운영체제 파일
.DS_Store
Thumbs.db

# 로그
*.log
npm-debug.log*
```

### Git Hooks 설정 (선택사항)
`.husky/pre-commit`:
```bash
#!/bin/sh
npm run typecheck
npm run lint
npm run test:unit
```

`.husky/commit-msg`:
```bash
#!/bin/sh
npx commitlint --edit "$1"
```

### 유용한 Git 명령어

#### 브랜치 관리
```bash
# 브랜치 목록 확인
git branch -av

# 원격 브랜치 동기화
git fetch --prune

# 병합되지 않은 브랜치 찾기
git branch --no-merged v2

# 오래된 브랜치 삭제
git branch -d feature/old-feature
git push origin --delete feature/old-feature
```

#### 충돌 해결
```bash
# 충돌 상태 확인
git status

# 충돌 파일 편집 후
git add .
git rebase --continue  # 또는 git merge --continue

# 리베이스 중단
git rebase --abort
```

#### 히스토리 관리
```bash
# 대화형 리베이스 (최근 5개 커밋)
git rebase -i HEAD~5

# 커밋 수정
git commit --amend

# 커밋 메시지 수정
git commit --amend -m "새 메시지"
```

## 협업 규칙

### 1. 일일 작업
1. 시작 전: `git pull origin v2`
2. 작업 중: 작은 단위 커밋
3. 종료 전: 현재 작업 푸시

### 2. 주간 동기화
- 월요일 아침: 전체 리베이스
- 금요일 오후: 미처리 PR 정리
- 주말: 긴급 상황 대비

### 3. 커뮤니케이션
- PR 설명에 상세한 내용 작성
- 리뷰 시 구체적인 피드백
- 이슈 트래커 활용 (GitHub Issues)

## 문제 해결

### 일반적인 문제

#### 1. 병합 충돌
```bash
# 최신 상태로 업데이트
git checkout v2
git pull origin v2

# 브랜치 리베이스
git checkout feature/my-feature
git rebase v2

# 충돌 해결 후 계속
git add .
git rebase --continue
```

#### 2. 실수로 main 브랜치에 커밋
```bash
# 새로운 브랜치 생성 (실수 커밋 포함)
git branch feature/correct-branch

# main 브랜치 되돌리기
git checkout v2
git reset --hard HEAD~1
git push origin v2 --force
```

#### 3. 커밋 분할
```bash
# 대화형 리베이스
git rebase -i HEAD~3

# pick 대신 edit으로 변경
# 각 단계에서
git reset HEAD~1
git add -p  # 부분 스테이징
git commit -m "부분 커밋"
git rebase --continue
```

## CI/CD 통합

### GitHub Actions 워크플로우
`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [v2, feature/*, bugfix/*]
  pull_request:
    branches: [v2]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with: { node-version: '18' }
      
    - name: Install dependencies
      run: npm ci
      
    - name: Type check
      run: npm run typecheck
      
    - name: Run unit tests
      run: npm run test:unit
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Build
      run: npm run build
```

## 다음 단계

1. 첫 번째 기능 브랜치 생성 실습
2. PR 생성 및 리뷰 프로세스 이해
3. 릴리스 프로세스 시뮬레이션

## 참고 자료

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)

## 업데이트 기록

- 2026-04-21: 초안 작성 완료
- 2026-04-21: V2 특별 전략 추가
- 2026-04-21: 협업 규칙 상세화