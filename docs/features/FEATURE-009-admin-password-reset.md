# FEATURE-009: 관리자 비밀번호 초기화(Admin Password Reset)

- 문서 버전: v1.3
- 작성일: 2026-04-24
- 연계 PRD: SR-12

## 1. 목적/범위

일반 사용자용 `비밀번호 찾기` 대신 운영자용 계정 복구 흐름을 제공한다.
이번 범위는 username allowlist 기반 admin API, 감사 로그, 세션 무효화, 노트 화면 내부 관리자 패널 UI, 그리고 임시 비밀번호 로그인 후 강제 비밀번호 변경 플로우까지 포함한다.

포함 범위:

- 운영자 권한 확인
- 사용자 목록/검색
- 서버 생성 임시 비밀번호 발급
- 대상 사용자의 기존 세션 무효화
- 대상 사용자의 로그인 실패 기록 정리
- 비밀번호 초기화 감사 로그 기록/조회
- 노트 화면 내부 관리자 패널 UI
- 임시 비밀번호 로그인 후 사용자 본인 비밀번호 변경 강제

제외 범위:

- 이메일/SMS 발송
- 일반 사용자용 비밀번호 찾기 화면
- 별도 `/admin` 전용 앱
- 역할(Role) 기반 다중 관리자 시스템

## 2. 사용자 시나리오

1. 운영자가 일반 로그인으로 서비스에 접속한다.
2. allowlist에 포함된 운영자만 노트 화면에서 관리자 패널 버튼을 본다.
3. 운영자는 사용자 검색 후 대상 계정의 비밀번호를 초기화한다.
4. 시스템은 임시 비밀번호를 반환하고 대상 사용자의 기존 세션과 로그인 실패 기록을 정리한다.
5. 운영자는 안전한 채널로 임시 비밀번호를 전달한다.
6. 사용자는 임시 비밀번호로 로그인한다.
7. 사용자는 즉시 자신의 새 비밀번호를 설정한 뒤 정상 사용 상태로 돌아간다.

## 3. 기능 요구사항

### 3.1 관리자 권한

- 운영자 권한은 `ADMIN_USERNAMES` 환경변수의 comma-separated username allowlist로 관리한다.
- 인증되지 않은 사용자는 admin API에 접근할 수 없다.
- 인증되었지만 allowlist에 없는 사용자는 `403`을 받는다.

### 3.2 관리자 패널

- 관리자 패널은 노트 화면 내부 슬라이드오버 패널이다.
- 일반 사용자에게는 진입 버튼이 보이지 않는다.
- 현재 로그인한 관리자 본인 계정은 UI와 API 모두에서 초기화할 수 없다.
- 패널 안에서 사용자 검색, 초기화 결과, 감사 로그를 한 화면에서 확인한다.

### 3.3 비밀번호 초기화

- `POST /api/admin/users/{userId}/password-reset`는 서버가 생성한 임시 비밀번호로 대상 사용자의 비밀번호를 교체한다.
- 초기화 직후 대상 사용자의 기존 비밀번호는 사용할 수 없어야 한다.
- 초기화 직후 `password_reset_required`를 `1`로 설정한다.
- 초기화 직후 대상 사용자의 모든 기존 세션을 무효화한다.
- 초기화 직후 대상 사용자의 `login_attempts` 기록을 정리한다.

### 3.4 사용자 본인 비밀번호 변경

- 사용자는 `POST /api/auth/change-password`로 현재 비밀번호를 검증한 뒤 새 비밀번호로 교체할 수 있다.
- 임시 비밀번호로 로그인한 사용자는 `passwordChangeRequired=true` 상태를 받고, UI에서 강제 비밀번호 변경 패널을 본다.
- 비밀번호 변경 성공 시 `password_reset_required`는 `0`으로 해제된다.
- 비밀번호 변경 성공 시 현재 세션만 유지하고 다른 세션은 모두 만료한다.

### 3.5 감사 로그

- 비밀번호 초기화 성공 시 `admin_password_resets` 테이블에 `admin_user_id`, `admin_username`, `target_user_id`, `target_username`, `reset_mode`, `created_at`를 기록한다.
- `GET /api/admin/audit/password-resets`는 최신순으로 최근 기록을 반환한다.

## 4. API/데이터 계약

### 엔드포인트

- `GET /api/admin/users?search=<username>&limit=<n>`
- `POST /api/admin/users/{userId}/password-reset`
- `GET /api/admin/audit/password-resets?limit=<n>`
- `POST /api/auth/change-password`

### 비밀번호 초기화 응답

```json
{
  "userId": "string",
  "username": "string",
  "tempPassword": "string",
  "resetAt": "timestamp",
  "resetBy": "string"
}
```

### 인증 응답 확장

```json
{
  "username": "string",
  "passwordChangeRequired": true
}
```

## 5. 상태/예외 처리

1. 인증 없음 -> `401 Unauthorized`
2. 비운영자 접근 -> `403 Forbidden`
3. 대상 사용자 없음 -> `404 Not Found`
4. 현재 로그인한 관리자 자기 자신 초기화 시도 -> `422 SELF_RESET_FORBIDDEN`
5. 현재 비밀번호 검증 실패 -> `401 AUTH_FAILED`

## 6. 테스트 기준

1. 비운영자는 admin API 접근 시 `403`을 받는다.
2. 관리자 비밀번호 초기화 후 기존 세션은 무효화된다.
3. 기존 비밀번호 로그인은 실패하고 임시 비밀번호 로그인은 성공한다.
4. 임시 비밀번호 로그인 응답과 `me` 응답은 `passwordChangeRequired=true`를 반환한다.
5. 사용자가 비밀번호를 변경하면 `passwordChangeRequired=false`로 돌아간다.
6. 비밀번호 변경 시 현재 세션만 유지되고 다른 세션은 만료된다.
7. 관리자 자기 계정 초기화는 UI와 API 모두에서 차단된다.

## 7. 보안 고려사항

1. 임시 비밀번호는 서버에서 생성하고 로그에 남기지 않는다.
2. 임시 비밀번호는 HTTPS 환경에서만 전달해야 한다.
3. 관리자 UI와 API는 allowlist 운영자에게만 노출되어야 한다.
4. 사용자 본인 비밀번호 변경은 현재 비밀번호 검증을 반드시 거쳐야 한다.

## 8. 후속 검토 항목

1. 관리자 권한을 역할 기반으로 확장할지 여부
2. 복구 알림 채널(email/SMS)을 붙일지 여부
3. 감사 로그 조회 UI를 별도 화면으로 확장할지 여부
