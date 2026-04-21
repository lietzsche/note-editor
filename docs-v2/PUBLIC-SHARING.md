# 노트 공개 URL 기능 상세 가이드

## 개요

이 문서는 노트 편집기 V2의 노트 공개 URL(공유) 기능을 상세히 설명합니다. 사용자는 자신의 노트를 공개 URL로 공유할 수 있으며, 해당 URL을 가진 누구나 노트 내용을 읽기 전용으로 볼 수 있습니다. 수정 권한은 원작자에게만 있으며, 공개된 노트는 검색 엔진에서 색인되지 않도록 설정됩니다.

## 목표

1. 간단한 공개 URL 생성 및 공유 시스템 구현
2. 읽기 전용 접근 제어 보장
3. 접근 통계 및 모니터링 기능 제공
4. 보안 및 개인정보 보호 고려사항 반영
5. 관리자 통제 기능 연동

## 기능 요구사항

### 1. 공개 URL 생성
- 노트별 고유한 공개 토큰 생성
- URL 형식: `https://도메인.com/s/공개토큰`
- QR 코드 생성 지원 (모바일 공유용)
- 공개 설정 시 즉시 적용

### 2. 접근 제어
- **읽기 전용**: 공개 URL로 접근하는 사용자는 내용만 볼 수 있음
- **수정 불가**: 편집, 삭제, 저장 기능 비활성화
- **인증 불필요**: 로그인 없이 접근 가능
- **만료 설정**: 영구적 또는 기한 설정 가능

### 3. 통계 및 모니터링
- 조회수 카운팅
- 마지막 접근 시간 기록
- 접근 IP 및 사용자 에이전트 로깅 (선택사항)
- 인기 공개 노트 대시보드

### 4. 관리 기능
- 공개 상태 ON/OFF 전환
- 공개 토큰 재생성 (기존 URL 무효화)
- 접근 통계 확인
- 일괄 비공개 처리

### 5. 보안 요구사항
- 예측 불가능한 토큰 사용 (UUID v4 또는 암호학적 랜덤)
- API 속도 제한 적용
- 악의적인 접근 시도 모니터링
- 개인정보 포함 노트 공개 경고

## 아키텍처 설계

### 데이터 흐름
```
사용자 노트 → [공개 설정] → 공개 토큰 생성 → 공개 URL 생성
                                     ↓
공개 URL 접근 → 토큰 검증 → 노트 조회 → 읽기 전용 뷰 제공
                                     ↓
                             접근 로그 기록 → 통계 업데이트
```

### 데이터베이스 스키마 (확장)

#### pages 테이블 확장 (기존)
```sql
-- 이미 DATABASE-MIGRATION.md에 정의됨
-- is_public BOOLEAN NOT NULL DEFAULT FALSE
-- public_token TEXT UNIQUE
-- public_view_count INTEGER NOT NULL DEFAULT 0
-- last_public_view_at TEXT
```

#### 공개 노트 접근 로그 테이블
```sql
-- DATABASE-MIGRATION.md에 정의됨
-- CREATE TABLE IF NOT EXISTS public_note_access_logs (...)
```

### API 엔드포인트

#### 사용자 API (인증 필요)
```
GET    /api/notes/:id/public-status      # 공개 상태 조회
POST   /api/notes/:id/make-public        # 노트 공개 설정
POST   /api/notes/:id/make-private       # 노트 비공개 설정
POST   /api/notes/:id/regenerate-token   # 공개 토큰 재생성
GET    /api/notes/:id/public-stats       # 공개 통계 조회
GET    /api/users/me/public-notes        # 사용자의 공개 노트 목록
```

#### 공개 접근 API (인증 불필요)
```
GET    /s/:token                         # 공개 노트 조회 (읽기 전용)
GET    /s/:token/stats                   # 공개 통계 (제한적)
GET    /s/:token/qr                      # QR 코드 생성
```

#### 관리자 API (관리자 권한 필요)
```
GET    /api/admin/public-notes           # 모든 공개 노트 목록
GET    /api/admin/public-notes/stats     # 전체 공개 통계
PUT    /api/admin/public-notes/:id/toggle # 공개 상태 강제 전환
```

## 상세 구현

### 1. 공개 토큰 생성 로직
```typescript
import { randomBytes } from 'crypto';

/**
 * 공개 토큰 생성 (암호학적 안전한 랜덤)
 * 형식: base64url 인코딩된 32바이트 랜덤
 * 예시: "wqJ8Lk3pRzT2Xv7Yq1NcD5BmKj9Hf6Gt"
 */
async function generatePublicToken(): Promise<string> {
  const buffer = randomBytes(32);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * 토큰 유효성 검증
 */
function isValidToken(token: string): boolean {
  // 길이 체크 (base64url 인코딩된 32바이트 = 43자)
  if (token.length !== 43) return false;
  
  // 형식 체크 (base64url 문자만 허용)
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return base64urlRegex.test(token);
}
```

### 2. 노트 공개 설정 API
```typescript
interface MakePublicRequest {
  expiresAt?: string; // ISO 8601 날짜 문자열 (선택사항)
  allowComments?: boolean; // 댓글 허용 (미래 기능)
}

async function makeNotePublic(
  userId: string,
  noteId: string,
  request: MakePublicRequest
): Promise<PublicNoteResponse> {
  // 1. 권한 확인 (노트 소유자만 공개 가능)
  const note = await getNoteById(noteId);
  if (note.user_id !== userId) {
    throw new Error('권한이 없습니다');
  }

  // 2. 이미 공개된 노트인지 확인
  if (note.is_public) {
    throw new Error('이미 공개된 노트입니다');
  }

  // 3. 공개 토큰 생성
  const publicToken = await generatePublicToken();

  // 4. 데이터베이스 업데이트
  await db.execute(
    `UPDATE pages 
     SET is_public = TRUE, 
         public_token = ?,
         public_view_count = 0,
         last_public_view_at = NULL
     WHERE id = ? AND user_id = ?`,
    [publicToken, noteId, userId]
  );

  // 5. 감사 로그 기록
  await logAuditEvent({
    eventType: 'note_made_public',
    userId,
    username: await getUsername(userId),
    targetId: noteId,
    details: `노트 공개 설정: ${note.title}`,
  });

  // 6. 공개 URL 생성
  const publicUrl = `${process.env.PUBLIC_APP_URL}/s/${publicToken}`;

  return {
    success: true,
    noteId,
    publicToken,
    publicUrl,
    qrCodeUrl: `${process.env.PUBLIC_APP_URL}/s/${publicToken}/qr`,
    expiresAt: request.expiresAt,
    createdAt: new Date().toISOString(),
  };
}
```

### 3. 공개 노트 조회 API (읽기 전용)
```typescript
async function getPublicNote(token: string, clientInfo: ClientInfo) {
  // 1. 토큰 유효성 검증
  if (!isValidToken(token)) {
    throw new Error('유효하지 않은 토큰입니다');
  }

  // 2. 노트 조회 (공개된 노트만)
  const note = await db
    .prepare(
      `SELECT 
        p.id, p.title, p.content, p.user_id, p.group_id,
        p.created_at, p.updated_at, p.public_view_count,
        p.last_public_view_at, u.username as author_name
       FROM pages p
       JOIN users u ON p.user_id = u.id
       WHERE p.public_token = ? AND p.is_public = TRUE
       LIMIT 1`
    )
    .bind(token)
    .first<PublicNote>();

  if (!note) {
    throw new Error('공개 노트를 찾을 수 없습니다');
  }

  // 3. 조회수 증가 (분산 환경 고려)
  await incrementViewCount(note.id, clientInfo);

  // 4. 읽기 전용 응답 구성
  return {
    note: {
      id: note.id,
      title: note.title,
      content: note.content,
      author: note.author_name,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      viewCount: note.public_view_count + 1, // 증가된 값
      lastViewedAt: new Date().toISOString(),
    },
    permissions: {
      canEdit: false,
      canDelete: false,
      canShare: false,
      canComment: false, // 미래 기능
      canDownload: false, // 선택사항
    },
    metadata: {
      isPublic: true,
      publicUrl: `${process.env.PUBLIC_APP_URL}/s/${token}`,
      authorProfile: `/users/${note.user_id}/public`, // 미래 기능
    },
  };
}

async function incrementViewCount(noteId: string, clientInfo: ClientInfo) {
  // 1. 조회수 증가 (원자적 연산)
  await db
    .prepare(
      `UPDATE pages 
       SET public_view_count = public_view_count + 1,
           last_public_view_at = datetime('now')
       WHERE id = ?`
    )
    .bind(noteId)
    .run();

  // 2. 접근 로그 기록 (선택사항)
  if (process.env.LOG_PUBLIC_ACCESS === 'true') {
    await db
      .prepare(
        `INSERT INTO public_note_access_logs 
         (id, page_id, public_token, accessed_at, ip_address, user_agent, referrer)
         VALUES (?, ?, ?, datetime('now'), ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        noteId,
        clientInfo.token,
        clientInfo.ipAddress,
        clientInfo.userAgent,
        clientInfo.referrer
      )
      .run();
  }
}
```

### 4. 공개 노트 비공개 설정
```typescript
async function makeNotePrivate(userId: string, noteId: string) {
  // 1. 권한 확인
  const note = await getNoteById(noteId);
  if (note.user_id !== userId) {
    throw new Error('권한이 없습니다');
  }

  // 2. 공개 상태 확인
  if (!note.is_public) {
    throw new Error('이미 비공개 상태입니다');
  }

  // 3. 데이터베이스 업데이트 (토큰 유지 또는 null 설정)
  await db.execute(
    `UPDATE pages 
     SET is_public = FALSE,
         last_public_view_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
    [noteId, userId]
  );

  // 4. 감사 로그
  await logAuditEvent({
    eventType: 'note_made_private',
    userId,
    username: await getUsername(userId),
    targetId: noteId,
    details: `노트 비공개 설정: ${note.title}`,
  });

  return {
    success: true,
    noteId,
    wasPublic: true,
    finalViewCount: note.public_view_count,
    privateAt: new Date().toISOString(),
  };
}
```

## 프론트엔드 구현

### 1. 공개 설정 컴포넌트
```tsx
const PublicSharingToggle = ({ note, onStatusChange }) => {
  const [isPublic, setIsPublic] = useState(note.is_public);
  const [isLoading, setIsLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');

  const handleToggle = async () => {
    if (!window.confirm(
      isPublic 
        ? '이 노트를 비공개로 전환하시겠습니까? 공개 URL이 더 이상 작동하지 않습니다.'
        : '이 노트를 공개하시겠습니까? 누구나 읽을 수 있는 URL이 생성됩니다.'
    )) {
      return;
    }

    setIsLoading(true);

    try {
      if (isPublic) {
        // 비공개 전환
        await api.notes.makePrivate(note.id);
        setIsPublic(false);
        setPublicUrl('');
        alert('노트가 비공개로 전환되었습니다.');
      } else {
        // 공개 전환
        const result = await api.notes.makePublic(note.id, {});
        setIsPublic(true);
        setPublicUrl(result.data.publicUrl);
        alert(`노트가 공개되었습니다!\n공개 URL: ${result.data.publicUrl}`);
      }
      
      onStatusChange?.(!isPublic);
    } catch (error) {
      alert(`작업 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      alert('공개 URL이 클립보드에 복사되었습니다.');
    } catch (error) {
      alert('복사 실패: ' + error.message);
    }
  };

  return (
    <div className="public-sharing-toggle">
      <div className="toggle-header">
        <h3>공개 설정</h3>
        <div className="toggle-switch">
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={handleToggle}
              disabled={isLoading}
            />
            <span className="slider"></span>
          </label>
          <span className="toggle-label">
            {isPublic ? '공개 중' : '비공개'}
          </span>
        </div>
      </div>

      {isPublic && publicUrl && (
        <div className="public-url-section">
          <div className="url-display">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="url-input"
            />
            <button
              onClick={copyToClipboard}
              className="copy-button"
              title="URL 복사"
            >
              📋
            </button>
          </div>
          
          <div className="url-actions">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="preview-button"
            >
              🔍 미리보기
            </a>
            <a
              href={`${publicUrl}/qr`}
              target="_blank"
              rel="noopener noreferrer"
              className="qr-button"
            >
              📱 QR 코드
            </a>
            <button
              onClick={() => api.notes.regenerateToken(note.id)}
              className="regenerate-button"
            >
              🔄 토큰 재생성
            </button>
          </div>

          <div className="public-stats">
            <span>👁️ 조회수: {note.public_view_count || 0}</span>
            {note.last_public_view_at && (
              <span>마지막 조회: {formatDate(note.last_public_view_at)}</span>
            )}
          </div>
        </div>
      )}

      {isPublic && (
        <div className="privacy-warning">
          <strong>⚠️ 주의사항</strong>
          <ul>
            <li>공개된 노트는 로그인 없이 누구나 볼 수 있습니다.</li>
            <li>개인정보나 비밀번호가 포함되지 않았는지 확인하세요.</li>
            <li>언제든지 비공개로 전환할 수 있습니다.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
```

### 2. 공개 노트 읽기 전용 뷰
```tsx
const PublicNoteView = ({ token }) => {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPublicNote();
  }, [token]);

  const loadPublicNote = async () => {
    try {
      const response = await api.public.getNote(token);
      setNote(response.data.note);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">공개 노트를 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="error-view">
        <h2>접근 불가</h2>
        <p>{error}</p>
        <p>노트가 삭제되었거나, 비공개로 전환되었을 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="public-note-view">
      <header className="public-header">
        <h1>{note.title}</h1>
        <div className="note-meta">
          <span>작성자: {note.author}</span>
          <span>작성일: {formatDate(note.createdAt)}</span>
          <span>조회수: {note.viewCount}</span>
        </div>
      </header>

      <div className="content-wrapper">
        <div className="note-content">
          <pre>{note.content}</pre>
        </div>
      </div>

      <footer className="public-footer">
        <div className="view-info">
          마지막 조회: {formatDate(note.lastViewedAt)}
        </div>
        <div className="disclaimer">
          이 노트는 읽기 전용입니다. 편집 권한은 원작자에게 있습니다.
        </div>
      </footer>
    </div>
  );
};
```

## 보안 및 개인정보 보호

### 1. 접근 제어
- **CSRF 방지**: 공개 엔드포인트에 CSRF 토큰 불필요 (읽기 전용)
- **CORS 설정**: 적절한 CORS 헤더 구성
- **Rate Limiting**: IP별 분당 요청 수 제한
- **SQL Injection 방지**: 파라미터화된 쿼리 사용

### 2. 개인정보 보호
- **내용 검사**: 주민등록번호, 전화번호, 이메일 패턴 감지 (선택사항)
- **메타데이터 제거**: 편집 내역, 위치 정보 등 제거
- **검색 엔진 제외**: `robots.txt` 및 `X-Robots-Tag` 설정
- **접근 로그**: IP 주소 마스킹 옵션

### 3. 토큰 보안
```typescript
// 토큰 보안 검증
function validateTokenSecurity(token: string): SecurityCheckResult {
  const checks = {
    lengthValid: token.length === 43,
    formatValid: /^[A-Za-z0-9_-]+$/.test(token),
    notBlacklisted: !isTokenBlacklisted(token),
    rateLimitOk: checkRateLimit(token),
  };

  const allPassed = Object.values(checks).every(Boolean);
  
  return {
    passed: allPassed,
    checks,
    riskLevel: allPassed ? 'low' : 'high',
  };
}
```

## 테스트 시나리오

### 단위 테스트
```typescript
describe('공개 노트 기능', () => {
  test('공개 토큰 생성 형식 검증', () => {
    const token = generatePublicToken();
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test('공개 설정 시 권한 검증', async () => {
    // 다른 사용자의 노트 공개 시도
    await expect(
      makeNotePublic('user2', 'note-owned-by-user1', {})
    ).rejects.toThrow('권한이 없습니다');
  });

  test('공개 노트 조회수 증가', async () => {
    const initialNote = await getNoteById('public-note-id');
    await getPublicNote('valid-token', clientInfo);
    const updatedNote = await getNoteById('public-note-id');
    
    expect(updatedNote.public_view_count)
      .toBe(initialNote.public_view_count + 1);
  });
});
```

### 통합 테스트
```typescript
describe('공개 URL 엔드포인트', () => {
  test('공개 노트 정상 조회', async () => {
    const res = await fetch(`${BASE}/s/valid-public-token`);
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.note.title).toBeDefined();
    expect(data.permissions.canEdit).toBe(false);
  });

  test('유효하지 않은 토큰 거부', async () => {
    const res = await fetch(`${BASE}/s/invalid-token-123`);
    expect(res.status).toBe(404);
  });

  test('비공개 노트 접근 불가', async () => {
    // 1. 노트 공개
    await makeNotePublic('user1', 'note1', {});
    
    // 2. 노트 비공개
    await makeNotePrivate('user1', 'note1');
    
    // 3. 접근 시도
    const res = await fetch(`${BASE}/s/token-from-step1`);
    expect(res.status).toBe(404);
  });
});
```

## 배포 및 운영

### 1. 환경 변수 설정
```env
# 공개 URL 기본 도메인
PUBLIC_APP_URL=https://notes.yourdomain.com

# 공개 접근 로깅
LOG_PUBLIC_ACCESS=true
LOG_IP_MASKING=true  # IP 마스킹 (예: 192.168.xxx.xxx)

# Rate limiting
PUBLIC_RATE_LIMIT=100  # IP별 분당 요청 수
TOKEN_RATE_LIMIT=1000  # 토큰별 분당 요청 수

# 보안 설정
ALLOW_PUBLIC_QR_CODES=true
ALLOW_PUBLIC_STATS=true
```

### 2. 모니터링 지표
- 공개 노트 수 및 증가 추이
- 공개 노트 평균 조회수
- 공개 URL 접근 실패율
- 가장 인기 있는 공개 노트
- 비공개 전환 빈도

### 3. 정기 유지보수
```sql
-- 오래된 접근 로그 정리 (90일 이상)
DELETE FROM public_note_access_logs 
WHERE accessed_at < datetime('now', '-90 days');

-- 사용되지 않는 공개 토큰 점검
SELECT p.id, p.title, u.username, p.last_public_view_at
FROM pages p
JOIN users u ON p.user_id = u.id
WHERE p.is_public = TRUE 
  AND p.last_public_view_at < datetime('now', '-180 days');
```

## 문제 해결

### 일반적인 문제

#### 1. 공개 URL 접근 불가
```bash
# 토큰 존재 확인
npx wrangler d1 execute note-editor-v2-db --command="
  SELECT id, title, is_public, public_token 
  FROM pages 
  WHERE public_token = '문제토큰'
"

# 공개 상태 확인
npx wrangler d1 execute note-editor-v2-db --command="
  UPDATE pages 
  SET is_public = TRUE 
  WHERE public_token = '문제토큰'
"
```

#### 2. 조회수 불일치
```sql
-- 조회수 수동 조정
UPDATE pages 
SET public_view_count = (
  SELECT COUNT(*) 
  FROM public_note_access_logs 
  WHERE page_id = pages.id
)
WHERE is_public = TRUE;
```

#### 3. 성능 문제
```sql
-- 접근 로그 테이블 인덱스 확인
CREATE INDEX IF NOT EXISTS idx_access_logs_token 
ON public_note_access_logs(public_token, accessed_at);

-- 파티셔닝 고려 (대량 트래픽 시)
-- 페이지 테이블 샤딩 전략 수립
```

## 다음 단계

1. **댓글 기능 추가**: 공개 노트에 댓글 시스템 연동
2. **소셜 공유 최적화**: Open Graph 메타태그 추가
3. **접근 제어 강화**: 비밀번호 보호, 기간 제한
4. **분석 대시보드**: 상세 접근 통계 시각화
5. **API 확장**: 타 서비스와의 연동 (예: Slack, Discord)

## 참고 자료

- [RFC 6750: OAuth 2.0 공개 접근](https://tools.ietf.org/html/rfc6750)
- [보안 토큰 생성 가이드](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [GDPR 및 공개 데이터 처리](https://gdpr-info.eu/)

## 업데이트 기록

- 2026-04-21: 초안 작성 완료
- 2026-04-21: API 설계 및 구현 예시 추가
- 2026-04-21: 보안 고려사항 및 테스트 시나리오 추가