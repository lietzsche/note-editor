# API 명세서

## 개요

노트 편집기 V2의 RESTful API 명세서입니다. 모든 API 엔드포인트는 인증이 필요하며, JSON 형식으로 요청과 응답을 주고받습니다.

## 기본 정보

- **기본 URL**: `https://note-editor-v2.your-domain.workers.dev/api`
- **인증**: JWT 토큰 (Bearer Token)
- **응답 형식**: JSON
- **에러 처리**: HTTP 상태 코드 + 에러 메시지

## 인증 API

### 사용자 등록

```
POST /api/auth/register
```

**요청 본문**:
```json
{
  "username": "string (필수, 3-20자)",
  "email": "string (필수, 유효한 이메일)",
  "password": "string (필수, 최소 8자)",
  "displayName": "string (선택, 2-30자)"
}
```

**응답 성공 (201)**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "username": "string",
    "email": "string",
    "displayName": "string",
    "createdAt": "ISO 8601 날짜"
  },
  "token": "JWT 토큰"
}
```

**응답 실패 (400)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "유효성 검사 실패",
    "details": {
      "username": ["사용자 이름은 3자 이상이어야 합니다."]
    }
  }
}
```

### 사용자 로그인

```
POST /api/auth/login
```

**요청 본문**:
```json
{
  "username": "string (필수)",
  "password": "string (필수)"
}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "username": "string",
    "displayName": "string",
    "lastLoginAt": "ISO 8601 날짜"
  },
  "token": "JWT 토큰"
}
```

**응답 실패 (401)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "잘못된 사용자 이름 또는 비밀번호"
  }
}
```

### 토큰 갱신

```
POST /api/auth/refresh
```

**헤더**:
```
Authorization: Bearer {리프레시 토큰}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "token": "새로운 JWT 토큰"
}
```

### 사용자 로그아웃

```
POST /api/auth/logout
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "message": "로그아웃 성공"
}
```

## 사용자 API

### 사용자 프로필 조회

```
GET /api/users/{userId}
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "username": "string",
    "email": "string",
    "displayName": "string",
    "createdAt": "ISO 8601 날짜",
    "lastLoginAt": "ISO 8601 날짜",
    "settings": {
      "theme": "light|dark|auto",
      "language": "ko|en",
      "timezone": "string"
    }
  }
}
```

### 사용자 프로필 수정

```
PATCH /api/users/{userId}
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**요청 본문**:
```json
{
  "displayName": "string (선택)",
  "settings": {
    "theme": "light|dark|auto",
    "language": "ko|en",
    "timezone": "string"
  }
}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "displayName": "string",
    "settings": {
      "theme": "light|dark|auto",
      "language": "ko|en",
      "timezone": "string"
    },
    "updatedAt": "ISO 8601 날짜"
  }
}
```

### 비밀번호 변경

```
PUT /api/users/{userId}/password
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**요청 본문**:
```json
{
  "currentPassword": "string (필수)",
  "newPassword": "string (필수, 최소 8자)"
}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "message": "비밀번호 변경 성공"
}
```

## 노트 API

### 노트 목록 조회

```
GET /api/notes
```

**쿼리 파라미터**:
- `group`: 그룹 ID (선택)
- `search`: 검색어 (선택)
- `limit`: 페이지당 항목 수 (기본값: 20)
- `offset`: 오프셋 (기본값: 0)
- `orderBy`: 정렬 기준 (createdAt|updatedAt|title, 기본값: updatedAt)
- `order`: 정렬 방향 (asc|desc, 기본값: desc)

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "noteId": "string",
        "title": "string",
        "content": "string",
        "groupId": "string",
        "groupId": "string|null",
        "tags": ["string"],
        "isPinned": "boolean",
        "createdAt": "ISO 8601 날짜",
        "updatedAt": "ISO 8601 날짜"
      }
    ],
    "pagination": {
      "total": "number",
      "limit": "number",
      "offset": "number",
      "hasMore": "boolean"
    }
  }
}
```

### 노트 단건 조회

```
GET /api/notes/{noteId}
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "noteId": "string",
    "title": "string",
    "content": "string",
    "groupId": "string",
    "tags": ["string"],
    "isPinned": "boolean",
    "isPublic": "boolean",
    "publicUrl": "string|null",
    "createdAt": "ISO 8601 날짜",
    "updatedAt": "ISO 8601 날짜",
    "createdBy": "string",
    "updatedBy": "string"
  }
}
```

### 노트 생성

```
POST /api/notes
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**요청 본문**:
```json
{
  "title": "string (필수, 최대 200자)",
  "content": "string (필수)",
  "groupId": "string (선택)",
  "tags": ["string"],
  "isPinned": "boolean (기본값: false)"
}
```

**응답 성공 (201)**:
```json
{
  "success": true,
  "data": {
    "noteId": "string",
    "title": "string",
    "content": "string",
    "groupId": "string|null",
    "tags": ["string"],
    "isPinned": "boolean",
    "createdAt": "ISO 8601 날짜",
    "updatedAt": "ISO 8601 날짜"
  }
}
```

### 노트 수정

```
PUT /api/notes/{noteId}
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**요청 본문**:
```json
{
  "title": "string (선택, 최대 200자)",
  "content": "string (선택)",
  "groupId": "string (선택)",
  "tags": ["string"],
  "isPinned": "boolean"
}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "noteId": "string",
    "title": "string",
    "content": "string",
    "groupId": "string|null",
    "tags": ["string"],
    "isPinned": "boolean",
    "updatedAt": "ISO 8601 날짜"
  }
}
```

### 노트 삭제

```
DELETE /api/notes/{noteId}
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "message": "노트 삭제 성공"
}
```

### 노트 순서 변경

```
PUT /api/notes/{noteId}/order
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**요청 본문**:
```json
{
  "position": "number (새로운 위치, 0부터 시작)",
  "groupId": "string (선택, 다른 그룹으로 이동시)"
}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "message": "노트 순서 변경 성공"
}
```

## 그룹 API

### 그룹 목록 조회

```
GET /api/groups
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "groupId": "string",
        "name": "string",
        "description": "string",
        "color": "string",
        "order": "number",
        "noteCount": "number",
        "createdAt": "ISO 8601 날짜",
        "updatedAt": "ISO 8601 날짜"
      }
    ]
  }
}
```

### 그룹 생성

```
POST /api/groups
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**요청 본문**:
```json
{
  "name": "string (필수, 최대 50자)",
  "description": "string (선택, 최대 200자)",
  "color": "string (선택, HEX 코드)"
}
```

**응답 성공 (201)**:
```json
{
  "success": true,
  "data": {
    "groupId": "string",
    "name": "string",
    "description": "string|null",
    "color": "string",
    "order": "number",
    "noteCount": "number",
    "createdAt": "ISO 8601 날짜",
    "updatedAt": "ISO 8601 날짜"
  }
}
```

### 그룹 순서 변경

```
PUT /api/groups/{groupId}/order
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**요청 본문**:
```json
{
  "position": "number (새로운 위치, 0부터 시작)"
}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "message": "그룹 순서 변경 성공"
}
```

## 공개 노트 API

### 공개 노트 생성

```
POST /api/notes/{noteId}/share
```

**헤더**:
```
Authorization: Bearer {JWT 토큰}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "publicUrl": "string",
    "expiresAt": "ISO 8601 날짜|null"
  }
}
```

### 공개 노트 조회 (인증 불필요)

```
GET /api/public/notes/{shareId}
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "noteId": "string",
    "title": "string",
    "content": "string",
    "createdAt": "ISO 8601 날짜",
    "updatedAt": "ISO 8601 날짜",
    "sharedBy": "string"
  }
}
```

## 관리자 API

### 시스템 상태 조회 (관리자만)

```
GET /api/admin/status
```

**헤더**:
```
Authorization: Bearer {JWT 토큰} (관리자 권한 필요)
```

**응답 성공 (200)**:
```json
{
  "success": true,
  "data": {
    "server": {
      "uptime": "number",
      "memoryUsage": "number",
      "cpuUsage": "number"
    },
    "database": {
      "connectionCount": "number",
      "queryCount": "number"
    },
    "users": {
      "total": "number",
      "activeToday": "number"
    },
    "notes": {
      "total": "number",
      "createdToday": "number"
    }
  }
}
```

### 사용자 목록 조회 (관리자만)

```
GET /api/admin/users
```

**쿼리 파라미터**:
- `limit`: 페이지당 항목 수 (기본값: 50)
- `offset`: 오프셋 (기본값: 0)

**헤더**:
```
Authorization: Bearer {JWT 토큰} (관리자 권한 필요)
```

## 에러 응답

### 공통 에러 형식

```json
{
  "success": false,
  "error": {
    "code": "에러 코드",
    "message": "사용자 친화적인 에러 메시지",
    "details": "추가 정보 (선택)"
  }
}
```

### HTTP 상태 코드 매핑

| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 400 | VALIDATION_ERROR | 요청 데이터 유효성 검사 실패 |
| 401 | UNAUTHORIZED | 인증 실패 또는 토큰 만료 |
| 403 | FORBIDDEN | 권한 부족 |
| 404 | NOT_FOUND | 리소스를 찾을 수 없음 |
| 409 | CONFLICT | 데이터 충돌 (중복 등) |
| 429 | RATE_LIMIT | 요청 횟수 초과 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |

## 요청 제한

### 속도 제한
- **일반 API**: 분당 60회
- **인증 API**: 분당 10회
- **관리자 API**: 분당 30회

### 요청 크기 제한
- **헤더**: 16KB
- **본문**: 1MB
- **URL**: 2KB

## 버전 관리

API 버전은 URL 경로에 포함됩니다:
- 현재 버전: `v1`
- 예시: `/api/v1/notes`

호환성이 손상되는 변경사항이 있을 경우 새로운 버전을 배포합니다.

## OpenAPI 명세

이 문서는 OpenAPI 3.0.3 사양과 호환됩니다. 자세한 명세는 별도 OpenAPI 파일(`openapi.yaml`)에서 확인할 수 있습니다.

---

*문서 버전: v1.0*  
*최종 업데이트: 2026-04-21*  
*API 버전: v1*