# FEATURE-009: 관리자 비밀번호 초기화(Admin Password Reset)

- 문서 버전: v1.1
- 작성일: 2026-04-24
- 연계 PRD: SR-12

## 1. 목적/범위

이 기능은 일반 사용자 대상의 `비밀번호 찾기`를 대체하는 운영자용 계정 복구 기능이다.  
이번 범위는 관리자 UI 전체가 아니라, 운영자 allowlist 기반 admin API와 감사 로그, 세션 무효화까지를 포함한다.

포함 범위:
- 운영자 권한 확인
- 사용자 목록 조회 및 username 검색
- 서버 생성 임시 비밀번호 발급
- 대상 사용자 기존 세션 무효화
- 대상 사용자 로그인 실패 누적 기록 정리
- 비밀번호 초기화 감사 로그 조회

제외 범위:
- 이메일/SMS 발송
- 일반 사용자용 비밀번호 찾기 화면
- 역할(Role) 기반 관리자 시스템
- 운영자 전용 웹 UI
- 다음 로그인 시 강제 비밀번호 변경 플로우

## 2. 사용자 시나리오

1. 운영자는 일반 로그인으로 서비스에 접근한다.
2. 운영자 username이 `ADMIN_USERNAMES` allowlist에 포함되어 있으면 admin API를 사용할 수 있다.
3. 운영자는 사용자 목록을 조회하거나 검색해서 대상 사용자를 찾는다.
4. 운영자는 대상 사용자의 비밀번호를 임시 비밀번호로 초기화한다.
5. 시스템은 새 임시 비밀번호를 반환하고, 대상 사용자의 기존 세션과 로그인 실패 누적을 정리한다.
6. 운영자는 별도 안전한 채널로 임시 비밀번호를 전달한다.
7. 운영자는 감사 로그 API로 초기화 이력을 확인한다.

## 3. 기능 요구사항

1. `운영자 권한`
- 운영자 권한은 환경변수 `ADMIN_USERNAMES`의 comma-separated username allowlist로 관리한다.
- 인증된 사용자만 admin API를 호출할 수 있다.
- 인증은 되었지만 allowlist에 없는 사용자는 403을 받는다.

2. `사용자 조회`
- `GET /api/admin/users`는 운영자가 볼 수 있는 사용자 목록을 반환한다.
- `search` query로 username 부분 검색을 지원한다.
- 응답에는 `id`, `username`, `created_at`만 포함한다.

3. `비밀번호 초기화`
- `POST /api/admin/users/{userId}/password-reset`는 서버가 생성한 임시 비밀번호로 대상 사용자의 비밀번호를 교체한다.
- 응답에는 임시 비밀번호와 초기화 시각, 수행 운영자 username을 포함한다.
- 기존 비밀번호는 더 이상 사용할 수 없어야 한다.

4. `세션/로그인 시도 정리`
- 비밀번호 초기화 직후 대상 사용자의 기존 세션은 전부 무효화한다.
- 비밀번호 초기화 직후 대상 사용자의 `login_attempts` 기록은 정리해서 새 임시 비밀번호 로그인 시도에 방해가 없도록 한다.

5. `감사 로그`
- 초기화 성공 시 `admin_password_resets` 테이블에 운영자/대상 사용자/시각/모드를 기록한다.
- `GET /api/admin/audit/password-resets`는 최근 기록을 최신순으로 반환한다.

## 4. API/데이터 계약

1. 엔드포인트
- `GET /api/admin/users?search=<username>&limit=<n>`
- `POST /api/admin/users/{userId}/password-reset`
- `GET /api/admin/audit/password-resets?limit=<n>`

2. 비밀번호 초기화 응답
```json
{
  "userId": "string",
  "username": "string",
  "tempPassword": "string",
  "resetAt": "timestamp",
  "resetBy": "string"
}
```

3. 감사 로그 응답 항목
```json
{
  "id": "string",
  "admin_user_id": "string",
  "admin_username": "string",
  "target_user_id": "string",
  "target_username": "string",
  "reset_mode": "generated",
  "created_at": "timestamp"
}
```

4. DB 변경
- 새 테이블: `admin_password_resets`
- 컬럼: `id`, `admin_user_id`, `admin_username`, `target_user_id`, `target_username`, `reset_mode`, `created_at`

## 5. 상태/예외 처리

1. 인증 없음 -> 401 Unauthorized
2. 비운영자 접근 -> 403 Forbidden
3. 대상 사용자 없음 -> 404 Not Found
4. DB 쓰기 실패 -> 500 Internal Server Error

## 6. 테스트 기준(TDD 관점)

1. Red
- 비운영자 admin API 접근 실패
- 인증 없는 admin API 접근 실패
- 존재하지 않는 사용자 초기화 실패

2. Green
- 운영자 사용자 목록 조회 성공
- 운영자 username 검색 성공
- 운영자 비밀번호 초기화 성공
- 기존 세션 무효화 확인
- 기존 비밀번호 로그인 실패, 임시 비밀번호 로그인 성공
- 감사 로그 조회 성공

3. Refactor
- 운영자 allowlist 파싱 보조 함수 정리
- admin audit 조회/limit 처리 정리

## 7. 보안 고려사항

1. 운영자 권한은 환경변수 allowlist에만 의존하므로 배포 설정 누락을 운영 절차에서 반드시 막아야 한다.
2. 임시 비밀번호는 서버에서 생성하고, 로그에 남기지 않는다.
3. 임시 비밀번호는 HTTPS 환경에서만 전달해야 한다.
4. admin API 응답은 운영자에게만 노출되어야 하며 일반 사용자 UI에 연결하지 않는다.

## 8. 오픈 이슈

1. 운영자 전용 웹 UI를 만들지 여부
2. 역할 기반 관리자 모델로 확장할지 여부
3. 다음 로그인 시 강제 비밀번호 변경 플로우를 추가할지 여부
