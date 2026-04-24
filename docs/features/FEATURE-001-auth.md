# FEATURE-001: 인증(Auth)

- 문서 버전: v1.1
- 작성일: 2026-04-24
- 연계 PRD: SR-1, SR-7

## 1. 목적/범위

회원가입, 로그인, 로그아웃, 세션 확인, 자기 비밀번호 변경을 제공하고 보호 API 접근을 제어한다.
임시 비밀번호로 로그인한 사용자는 `passwordChangeRequired` 상태를 통해 즉시 새 비밀번호 설정 흐름으로 유도한다.

## 2. 사용자 시나리오

1. 신규 사용자가 가입 후 바로 로그인한다.
2. 로그인한 사용자가 보호 API를 호출한다.
3. 로그아웃 후 보호 API 접근이 차단된다.
4. 운영자가 비밀번호를 초기화한 사용자가 임시 비밀번호로 로그인한다.
5. 사용자는 로그인 직후 자기 비밀번호를 새 값으로 변경한다.

## 3. 기능 요구사항

1. `signup`은 유효한 입력으로 계정을 생성하고 세션을 발급한다.
2. `login`은 성공 시 세션을 발급한다.
3. `logout`은 현재 세션을 무효화한다.
4. `me`는 현재 로그인한 사용자와 `passwordChangeRequired` 상태를 반환한다.
5. `change-password`는 현재 비밀번호를 검증한 뒤 새 비밀번호로 교체한다.
6. 비밀번호 변경 후 현재 세션만 유지하고 다른 세션은 만료한다.
7. 임시 비밀번호 상태는 비밀번호 변경 성공 시 해제된다.
8. 인증 실패는 공통 에러 envelope로 반환한다.
9. 세션은 기본 absolute TTL 7일을 사용한다.
10. 세션 쿠키는 `HttpOnly`, `SameSite=Lax`를 기본으로 하고 운영 환경에서는 `Secure`를 강제한다.
11. 로그인 실패 rate limit은 기본 5분 동안 5회 초과 시 차단한다.
12. 인증 이벤트(`login_success`, `login_failure`, `logout`, `password_change`)는 감사 로그에 기록한다.

## 4. API/데이터 계약

### 엔드포인트

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### 성공 응답

`signup`, `login`, `me`, `change-password`

```json
{
  "username": "string",
  "passwordChangeRequired": false
}
```

### 실패 응답

```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

## 5. 상태/예외 처리

1. 잘못된 자격증명은 `401 AUTH_FAILED`를 반환한다.
2. 인증 없는 요청은 `401 Unauthorized`를 반환한다.
3. 새 비밀번호가 정책에 맞지 않으면 `400 VALIDATION`을 반환한다.
4. 새 비밀번호가 현재 비밀번호와 같으면 `400 VALIDATION`을 반환한다.
5. 세션 만료 시 재로그인이 필요하다.

## 6. 입력 검증 정책

1. 비밀번호는 최소 6자 이상이다.
2. username은 2~40자다.

## 7. 테스트 기준

1. 가입/로그인/로그아웃/세션 확인이 정상 동작한다.
2. `passwordChangeRequired`가 기본값 `false`로 반환된다.
3. 자기 비밀번호 변경 후 이전 비밀번호 로그인은 실패하고 새 비밀번호 로그인은 성공한다.
4. 잘못된 현재 비밀번호로 변경 시 `401`을 반환한다.
5. 같은 비밀번호로 변경 시 `400`을 반환한다.

## 8. 연계 테스트 시나리오

- `docs/testing/TEST_PLAN.md` TS-01, TS-05, TS-06, TS-12
