# 시작 노트 자동 열기 & 다중 계정 스위칭 설계

## 1. 목적 및 배경

개인·업무 등 여러 계정을 오가며 PC와 모바일 어디서든 빠르게 작업할 수 있도록 두 가지 기능을 추가한다.

1. **시작 노트 자동 열기**: 계정별로 지정한 노트 1개를 로그인 직후, 앱 재진입 시, 그리고 다른 계정으로 전환했을 때 자동으로 연다.
2. **다중 로그인 & 계정 스위칭**: 한 브라우저에서 최대 5개 계정까지 동시에 로그인 상태를 유지하고, 비밀번호 재입력 없이 1클릭으로 계정을 전환한다.

## 2. 목표 / 비목표

### 목표
- 시작 노트 설정을 서버(D1)에 계정별로 저장하여 PC·모바일 및 계정 전환 시 일관되게 동기화한다.
- 모바일(`<= 900px`)에서도 시작 노트가 설정되어 있으면 목록을 거치지 않고 에디터 화면으로 바로 진입한다.
- 기존 `HttpOnly; SameSite=Lax` 쿠키 보안 모델을 유지하면서 다중 세션을 안전하게 관리한다.
- 계정 전환 시 이전 계정의 노트 캐시·검색어·에디터 상태·토스트가 다음 계정으로 누수되지 않도록 완전히 격리한다.
- 편집 중인 미저장 변경사항이 있을 때 계정 전환·로그아웃 시 기존 저장 확인 다이얼로그로 데이터 유실을 방지한다.
- 로그아웃 시 기본 동작은 **현재 계정만 로그아웃**하며, 남은 로그인 계정이 있으면 해당 계정으로 자동 전환한다. (2개 이상 로그인 시 "모든 계정 로그아웃"도 제공)

### 비목표
- 계정 간 노트 공유·복사·통합 검색
- 6개 이상 동시 로그인 지원 (쿠키 4KB 한계 내에서 최대 5개로 제한)
- 브라우저 탭마다 서로 다른 활성 계정을 독립 유지하는 기능 (쿠키 기반이므로 같은 브라우저 내 활성 계정을 공유)

## 3. 선택한 접근 방식

### 다중 세션 저장
- **선택**: **방식 A — `HttpOnly` 쿠키 다중 세션 슬롯 (`v: 2`)**
  - 기존 단일 쿠키 `{ sessionId, userId, username }`를 `{ v: 2, activeSessionId, sessions: [...] }` 구조로 확장하고 기존과 동일하게 HMAC-SHA256으로 서명한다.
  - 기존 v1 단일 세션 쿠키도 하위 호환 파싱하여 배포 직후 기존 로그인 세션이 끊기지 않게 한다.
  - 각 세션은 기존 D1 `sessions` 테이블에 그대로 저장되므로 만료·비밀번호 변경·관리자 초기화에 따른 세션 무효화가 그대로 동작한다.
- **기각한 대안**: 방식 B(D1 `session_groups` 번들 테이블 추가) — 동시 계정 수 제한이 없어지지만, 매 요청마다 추가 DB 조회와 테이블 관리 비용이 늘어나 2~5개 계정 용도에는 과하다.

### 시작 노트 저장
- `users` 테이블에 `startup_note_id TEXT REFERENCES pages(id) ON DELETE SET NULL` 컬럼을 추가한다 (`migrations/0009_startup_note.sql`, `schema.sql`).
- 노트가 휴지통으로 이동(`DELETE /api/notes/:id`)되거나 영구 삭제(`DELETE /api/notes/:id/permanent`)되면 해당 사용자의 `startup_note_id`도 즉시 `NULL`로 해제한다.

## 4. API 설계

### 공통 `AuthSession` 응답 형태
```ts
type AccountSummary = {
  userId: string;
  username: string;
  isActive: boolean;
};

type AuthSession = {
  userId: string;
  username: string;
  passwordChangeRequired: boolean;
  startupNoteId: string | null;
  accounts: AccountSummary[];
};
```

### 엔드포인트
- `GET /api/auth/me`: 현재 활성 계정의 `AuthSession` 반환. 활성 세션이 만료/삭제되었으나 쿠키에 다른 유효 세션이 남아 있으면 첫 유효 세션으로 자동 폴백한다.
- `POST /api/auth/login` / `POST /api/auth/signup`: 기존 쿠키의 유효 세션 목록을 유지하면서 새 세션을 추가(같은 `userId`가 이미 있으면 교체)하고 활성 계정을 새 세션으로 전환한다. 서로 다른 계정이 이미 5개일 때 새 계정 추가 시 `409 MAX_SESSIONS_REACHED` 반환.
- `POST /api/auth/switch`: `{ userId }`를 받아 쿠키 내 유효 세션 중 해당 계정으로 `activeSessionId`를 전환하고 새 `AuthSession` 반환.
- `POST /api/auth/logout`:
  - 요청 바디 `{ scope?: "current" | "all" }` (생략 시 `"current"`).
  - `"current"`이고 남은 유효 세션이 있으면 현재 세션만 D1에서 삭제하고 다음 유효 세션으로 전환한 뒤 `200` + `{ data: AuthSession }` 반환.
  - 남은 세션이 없거나 `"all"`이면 관련 세션을 모두 D1에서 삭제하고 쿠키를 비운 뒤 `204` 반환 (기존 단일 계정 로그아웃 동작과 100% 호환).
- `PUT /api/auth/startup-note`: `{ noteId: string | null }`를 받아 본인 소유이며 휴지통에 있지 않은 노트인 경우 `users.startup_note_id`를 갱신하고 `{ startupNoteId }` 반환.

## 5. 클라이언트 UI / 상태 흐름

### 시작 노트
- **진입 자동 열기**: `NotesPage` 마운트당 1회, 초기 `전체 노트` 로드 완료 시 `startupNoteId`가 있고 선택된 노트가 없으면 해당 노트를 자동으로 연다. 모바일에서는 `mobilePanel`을 `"editor"`로 전환한다.
- **설정 토글**:
  - 노트 목록 `⋯` 메뉴(`NoteRowMenu`)와 에디터 상단 `더보기` 메뉴(`EditorMoreMenu`)에 `시작 노트로 설정` / `시작 노트 해제` 항목 추가 (휴지통 노트는 제외).
  - 시작 노트로 지정된 목록 행에 작은 `시작` 배지 표시.

### 다중 계정 스위처
- 사이드바 하단(데스크톱) 및 계정 영역(모바일)의 `@username`을 클릭 가능한 **계정 스위처**(`AccountSwitcher`)로 변경.
  - 로그인된 계정 목록 표시 (현재 활성 계정 체크 표시, 다른 계정 클릭 시 즉시 전환)
  - `+ 다른 계정 로그인` 버튼 → 모달에서 아이디/비밀번호 입력 후 새 계정 추가 및 즉시 전환
  - 2개 이상 로그인 시 `모든 계정 로그아웃` 항목 노출
- **상태 격리**: `App.tsx`에서 `<NotesPage key={currentUser.userId} ... />`로 렌더링해 계정 전환 시 모든 메모리 캐시·검색어·에디터 상태·토스트가 깔끔하게 초기화된다.
- **미저장 변경 보호**: `notesPageTransitions.ts`의 `PendingAction`에 계정 전환/추가/로그아웃 액션을 포함해 편집 중인 내용이 있으면 기존 확인 다이얼로그를 먼저 띄운다.

## 6. 테스트 계획
- **단위 테스트**: 쿠키 v1/v2 호환 및 다중 세션 로직, `notesPageTransitions` 계정 전환 가드, `AccountSwitcher` / `NoteRowMenu` / `EditorMoreMenu` UI 동작.
- **API 통합 테스트 (`tests/api/`)**:
  - 시작 노트 설정/해제, 타인 노트/휴지통 노트 거부, 휴지통 이동 시 자동 해제, `me`/`login`/`switch` 응답 반영.
  - 다중 로그인(최대 5계정 제한), 계정 전환(`switch`), 현재 계정만 로그아웃 시 자동 전환, 전체 로그아웃(`scope: "all"`), 계정 간 데이터 격리.
- **최종 검증**: `npm run verify` 통과 확인.
