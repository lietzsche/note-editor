# SPEC-02: D1 스키마 관리 (Migration Framework)

## 1. 목적

D1 스키마를 `wrangler d1 migrations` 프레임워크로 일관 관리한다.

## 2. 정책

1. 스키마 변경은 migration 파일(append-only)로만 관리한다.
2. 원격 반영은 `migrations apply`만 사용한다.
3. 수동 SQL 직접 반영은 긴급 복구 상황 외 금지한다.
4. 기존 프로젝트 데이터 이전(마이그레이션)은 수행하지 않는다.

## 3. 초기 준비

### 3.1 D1 생성

```bash
npx wrangler d1 create <NEW_D1_DB_NAME>
npx wrangler d1 list
```

`database_id` 확인 후 `wrangler.toml`에 반영.

### 3.2 마이그레이션 상태 확인

```bash
npm run migrate:list:local
npm run migrate:list:remote
```

### 3.3 파일 위치

- 초기 스키마: `schema.sql`
- 마이그레이션 디렉터리: `migrations/`
- D1 바인딩 설정: `wrangler.toml`

## 4. 스키마 기준 (PRD SR-8/SR-9 반영)

### 4.1 필수 엔터티

1. `users`
- 사용자 계정 기준 엔터티

2. `groups`
- 필수 컬럼: `id`, `user_id`, `name`, `position`, `created_at`, `updated_at`
- 제약: `UNIQUE(user_id, name)`

3. `notes` (기존 `pages`를 노트 엔터티로 간주)
- 필수 컬럼: `id`, `user_id/owner_user_id`, `group_id`, `title`, `content`, `sort_order`, `updated_at`
- 제약: `group_id`는 같은 사용자 소유의 그룹만 참조 가능해야 한다.

### 4.2 권장 인덱스

1. `notes(user_id, sort_order)`
2. `notes(user_id, group_id, sort_order)`
3. `groups(user_id, position)`

## 5. 변경 절차

### 5.1 migration 생성

```bash
npm run migrate:create -- <change_name>
```

### 5.2 로컬 적용

```bash
npm run migrate:apply:local
```

### 5.3 원격 적용

```bash
npm run migrate:apply:remote
```

## 6. 검증

```bash
npx wrangler d1 execute DB --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
npx wrangler d1 execute DB --remote --command="PRAGMA table_info(users)"
npx wrangler d1 execute DB --remote --command="PRAGMA table_info(pages)"
npx wrangler d1 execute DB --remote --command="PRAGMA table_info(groups)"
npx wrangler d1 execute DB --remote --command="SELECT name FROM sqlite_master WHERE type='index' AND tbl_name IN ('pages','groups')"
```

## 7. 완료 기준

- [ ] migration 파일 생성/검토 완료
- [ ] local apply 성공
- [ ] remote apply 성공
- [ ] `users`, `groups`, `pages(notes)` 스키마 검증 완료
- [ ] 그룹/노트 조회용 인덱스 검증 완료
