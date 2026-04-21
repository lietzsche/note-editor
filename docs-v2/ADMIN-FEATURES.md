# 관리자 기능 및 비밀번호 초기화 가이드

## 개요

이 문서는 노트 편집기 V2의 관리자 기능과 비밀번호 초기화 시스템을 설명합니다. 관리자는 시스템 사용자를 관리하고, 필요한 경우 사용자 비밀번호를 초기화할 수 있는 권한을 가집니다.

## 목표

1. 관리자 역할 및 권한 시스템 구현
2. 관리자 대시보드 인터페이스 설계
3. 비밀번호 초기화 기능 구현 (초기값: qwer135!)
4. 사용자 관리 기능 (조회, 활성화/비활성화, 역할 변경)
5. 감사 로그 시스템을 통한 활동 기록

## 관리자 역할 정의

### 역할 계층 구조
```
시스템 관리자 (admin)
├── 모든 사용자 관리 권한
├── 비밀번호 초기화 권한
├── 모든 노트 조회 권한 (개인 노트 제외)
├── 시스템 설정 변경 권일
└── 감사 로그 조회 권한

일반 사용자 (user)
└── 본인 데이터 관리 권한만 보유
```

### 권한 매트릭스
| 기능 | 관리자 | 일반 사용자 |
|------|--------|-------------|
| 본인 노트 관리 | ✅ | ✅ |
| 다른 사용자 노트 조회 | ✅ (공개 노트만) | ❌ |
| 사용자 목록 조회 | ✅ | ❌ |
| 사용자 역할 변경 | ✅ | ❌ |
| 비밀번호 초기화 | ✅ | ❌ |
| 감사 로그 조회 | ✅ | ❌ |
| 시스템 설정 변경 | ✅ | ❌ |

## 1. 관리자 대시보드 설계

### 1.1 대시보드 레이아웃
```
관리자 대시보드
├── 사이드바 네비게이션
│   ├── 대시보드 홈
│   ├── 사용자 관리
│   ├── 비밀번호 초기화
│   ├── 감사 로그
│   └── 시스템 설정
├── 메인 콘텐츠 영역
└── 통계 요약 카드
```

### 1.2 주요 페이지

#### 대시보드 홈
- 시스템 통계 (총 사용자, 활성 사용자, 총 노트, 공개 노트)
- 최근 활동 로그
- 시스템 상태 모니터링

#### 사용자 관리
- 사용자 목록 테이블 (페이지네이션 포함)
- 사용자 검색 및 필터링
- 사용자 상세 정보 조회
- 역할 변경 (user ↔ admin)
- 계정 활성화/비활성화

#### 비밀번호 초기화
- 사용자 선택 인터페이스
- 초기화 확인 다이얼로그
- 초기화 기록 추적
- 일괄 초기화 기능 (선택사항)

#### 감사 로그
- 활동 기록 테이블
- 이벤트 유형별 필터링
- 시간대별 검색
- 로그 내보내기 기능

## 2. 데이터베이스 스키마 확장

### 2.1 기존 테이블 수정
```sql
-- users 테이블에 관리자 관련 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TEXT NOT NULL DEFAULT (datetime('now'));

-- 감사 로그 테이블 개선
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_username TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
```

### 2.2 비밀번호 초기화 기록 테이블
```sql
CREATE TABLE IF NOT EXISTS password_reset_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_reason TEXT,
  reset_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_password_reset_logs_admin_id ON password_reset_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_target_id ON password_reset_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_reset_at ON password_reset_logs(reset_at);
```

## 3. API 엔드포인트 설계

### 3.1 관리자 전용 API (인증: 관리자 역할 필요)

#### 사용자 관리
```
GET    /api/admin/users                    # 사용자 목록 조회
GET    /api/admin/users/:id               # 특정 사용자 상세 조회
PUT    /api/admin/users/:id/role          # 사용자 역할 변경
PUT    /api/admin/users/:id/status        # 계정 활성화/비활성화
```

#### 비밀번호 초기화
```
POST   /api/admin/users/:id/reset-password  # 비밀번호 초기화
GET    /api/admin/password-reset-logs      # 초기화 기록 조회
```

#### 감사 로그
```
GET    /api/admin/audit-logs              # 감사 로그 조회
GET    /api/admin/audit-logs/export       # 로그 내보내기
```

#### 시스템 통계
```
GET    /api/admin/stats                   # 시스템 통계 조회
GET    /api/admin/health                  # 시스템 건강 상태
```

### 3.2 API 요청/응답 예시

#### 사용자 목록 조회
```http
GET /api/admin/users?page=1&limit=20&role=user&search=john
Authorization: Bearer <관리자 토큰>

응답:
{
  "data": [
    {
      "id": "user-123",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "is_active": true,
      "created_at": "2026-04-20T10:30:00Z",
      "last_login_at": "2026-04-21T08:15:00Z",
      "note_count": 15,
      "public_note_count": 2
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "total_pages": 8
  }
}
```

#### 비밀번호 초기화 요청
```http
POST /api/admin/users/user-123/reset-password
Authorization: Bearer <관리자 토큰>
Content-Type: application/json

{
  "reason": "사용자 요청",
  "send_email": true
}

응답:
{
  "success": true,
  "data": {
    "user_id": "user-123",
    "username": "john_doe",
    "new_password": "qwer135!",
    "reset_at": "2026-04-21T09:30:00Z",
    "reset_by": "admin-user-id"
  }
}
```

## 4. 비밀번호 초기화 구현

### 4.1 초기화 알고리즘
```typescript
interface PasswordResetRequest {
  targetUserId: string;
  reason?: string;
  sendEmail?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

async function resetUserPassword(
  adminUser: User,
  request: PasswordResetRequest
): Promise<PasswordResetResult> {
  // 1. 권한 확인 (관리자만 가능)
  if (adminUser.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다');
  }

  // 2. 대상 사용자 확인
  const targetUser = await getUserById(request.targetUserId);
  if (!targetUser) {
    throw new Error('사용자를 찾을 수 없습니다');
  }

  // 3. 새 비밀번호 생성 (고정값: qwer135!)
  const newPassword = 'qwer135!';
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // 4. 비밀번호 업데이트
  await db.execute(
    `UPDATE users 
     SET password_hash = ?, password_changed_at = datetime('now')
     WHERE id = ?`,
    [passwordHash, targetUser.id]
  );

  // 5. 감사 로그 기록
  await logAuditEvent({
    eventType: 'password_reset',
    userId: adminUser.id,
    username: adminUser.username,
    targetUserId: targetUser.id,
    targetUsername: targetUser.username,
    details: `비밀번호 초기화: ${request.reason || '관리자 요청'}`,
    ipAddress: request.ipAddress,
  });

  // 6. 비밀번호 초기화 로그 기록
  await logPasswordReset({
    adminUserId: adminUser.id,
    targetUserId: targetUser.id,
    reason: request.reason,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
  });

  // 7. 이메일 알림 (선택사항)
  if (request.sendEmail && targetUser.email) {
    await sendPasswordResetEmail(
      targetUser.email,
      targetUser.username,
      newPassword
    );
  }

  return {
    success: true,
    userId: targetUser.id,
    username: targetUser.username,
    newPassword: newPassword,
    resetAt: new Date().toISOString(),
  };
}
```

### 4.2 보안 고려사항
1. **로그 기록**: 모든 비밀번호 초기화 작업은 감사 로그에 기록
2. **이중 확인**: 중요한 작업 전에 관리자 확인 요청
3. **비밀번호 강도**: 초기 비밀번호는 강제 변경 유도
4. **IP 제한**: 관리자 기능 접근 IP 제한 (선택사항)
5. **속도 제한**: 연속된 초기화 요청 제한

### 4.3 이메일 템플릿
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>비밀번호가 초기화되었습니다</title>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>비밀번호 초기화 안내</h2>
    
    <p>안녕하세요, {{username}}님</p>
    
    <p>관리자에 의해 귀하의 계정 비밀번호가 초기화되었습니다.</p>
    
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <strong>새 비밀번호:</strong> {{password}}
    </div>
    
    <p style="color: #d32f2f; font-weight: bold;">
      ※ 보안을 위해 로그인 후 반드시 비밀번호를 변경해 주세요.
    </p>
    
    <p>초기화 사유: {{reason}}</p>
    <p>초기화 시각: {{resetAt}}</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <small>
        본 메일은 시스템에서 자동으로 발송되었습니다.<br>
        문의사항이 있으면 관리자에게 연락해 주세요.
      </small>
    </div>
  </div>
</body>
</html>
```

## 5. 프론트엔드 구현

### 5.1 관리자 라우트 보호
```typescript
// 관리자 라우트 가드
const AdminRoute = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};
```

### 5.2 관리자 대시보드 컴포넌트
```tsx
const AdminDashboard = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.admin.getStats(),
        api.admin.getAuditLogs({ limit: 10 })
      ]);
      
      setStats(statsRes.data);
      setRecentLogs(logsRes.data);
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
    }
  };
  
  return (
    <div className="admin-dashboard">
      <AdminSidebar />
      
      <main className="admin-main">
        <h1>관리자 대시보드</h1>
        
        {/* 통계 카드 */}
        <div className="stats-grid">
          <StatCard
            title="총 사용자"
            value={stats?.totalUsers || 0}
            icon="👥"
            trend={stats?.userGrowth || 0}
          />
          <StatCard
            title="활성 사용자"
            value={stats?.activeUsers || 0}
            icon="✅"
          />
          <StatCard
            title="총 노트"
            value={stats?.totalNotes || 0}
            icon="📝"
          />
          <StatCard
            title="공개 노트"
            value={stats?.publicNotes || 0}
            icon="🔗"
          />
        </div>
        
        {/* 최근 활동 */}
        <RecentActivity logs={recentLogs} />
        
        {/* 빠른 액션 */}
        <QuickActions />
      </main>
    </div>
  );
};
```

### 5.3 비밀번호 초기화 다이얼로그
```tsx
const PasswordResetDialog = ({ user, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!window.confirm(`정말로 ${user.username}의 비밀번호를 초기화하시겠습니까?`)) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await api.admin.resetPassword(user.id, {
        reason,
        sendEmail,
      });
      
      alert(`비밀번호가 초기화되었습니다.\n새 비밀번호: ${result.data.newPassword}`);
      onSuccess(result.data);
    } catch (error) {
      alert(`비밀번호 초기화 실패: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="password-reset-dialog">
        <h2>비밀번호 초기화</h2>
        
        <div className="user-info">
          <strong>대상 사용자:</strong> {user.username} ({user.email})
        </div>
        
        <div className="form-group">
          <label>초기화 사유</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="비밀번호 초기화 사유를 입력하세요"
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            이메일로 새 비밀번호 알림 전송
          </label>
          <small className="hint">
            사용자 이메일({user.email})로 초기화된 비밀번호를 알립니다.
          </small>
        </div>
        
        <div className="warning">
          <strong>⚠️ 주의사항</strong>
          <ul>
            <li>초기화된 비밀번호는 "qwer135!"로 설정됩니다.</li>
            <li>모든 비밀번호 초기화 작업은 감사 로그에 기록됩니다.</li>
            <li>사용자는 로그인 후 비밀번호를 변경해야 합니다.</li>
          </ul>
        </div>
        
        <div className="dialog-actions">
          <button onClick={onClose} disabled={isSubmitting}>
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="primary"
          >
            {isSubmitting ? '처리 중...' : '비밀번호 초기화'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

## 6. 테스트 시나리오

### 6.1 관리자 기능 테스트
```typescript
describe('관리자 기능', () => {
  let adminToken: string;
  let userToken: string;
  let testUserId: string;
  
  beforeAll(async () => {
    // 관리자 로그인
    const adminRes = await login('admin', 'qwer135!');
    adminToken = extractCookie(adminRes);
    
    // 테스트 사용자 생성
    const userRes = await signup('testuser', 'original123');
    testUserId = userRes.data.id;
    
    // 일반 사용자 로그인
    const loginRes = await login('testuser', 'original123');
    userToken = extractCookie(loginRes);
  });
  
  test('관리자는 사용자 목록을 조회할 수 있다', async () => {
    const res = await getAdminUsers(adminToken);
    expect(res.status).toBe(200);
    expect(res.data.data).toBeInstanceOf(Array);
    expect(res.data.data.length).toBeGreaterThan(0);
  });
  
  test('일반 사용자는 사용자 목록을 조회할 수 없다', async () => {
    const res = await getAdminUsers(userToken);
    expect(res.status).toBe(403);
  });
  
  test('관리자는 다른 사용자의 비밀번호를 초기화할 수 있다', async () => {
    const res = await resetPassword(adminToken, testUserId, {
      reason: '테스트 초기화',
    });
    
    expect(res.status).toBe(200);
    expect(res.data.newPassword).toBe('qwer135!');
    
    // 새 비밀번호로 로그인 테스트
    const loginRes = await login('testuser', 'qwer135!');
    expect(loginRes.status).toBe(200);
  });
  
  test('비밀번호 초기화는 감사 로그에 기록된다', async () => {
    const logsRes = await getAuditLogs(adminToken, {
      eventType: 'password_reset',
    });
    
    expect(logsRes.status).toBe(200);
    expect(logsRes.data.data.some(log => 
      log.targetUserId === testUserId && 
      log.eventType === 'password_reset'
    )).toBe(true);
  });
});
```

### 6.2 보안 테스트
```typescript
describe('관리자 기능 보안', () => {
  test('비인가 사용자는 관리자 API에 접근할 수 없다', async () => {
    const endpoints = [
      '/api/admin/users',
      '/api/admin/stats',
      '/api/admin/audit-logs',
    ];
    
    for (const endpoint of endpoints) {
      const res = await fetch(`${BASE}${endpoint}`);
      expect(res.status).toBe(401); // 인증 필요
    }
  });
  
  test('일반 사용자는 관리자 API에 접근할 수 없다', async () => {
    const userRes = await login('regularuser', 'password123');
    const userToken = extractCookie(userRes);
    
    const res = await getAdminUsers(userToken);
    expect(res.status).toBe(403); // 권한 없음
  });
  
  test('비밀번호 초기화 로그에는 IP와 사용자 에이전트가 기록된다', async () => {
    // 테스트 생략 (구현 시 상세화)
  });
});
```

## 7. 배포 및 운영

### 7.1 초기 관리자 설정
```bash
# 초기 관리자 계정 생성
npx wrangler d1 execute note-editor-v2-db --command="
  INSERT INTO users (id, username, password_hash, role, email)
  VALUES (
    'initial-admin-id',
    'admin',
    '\$2b\$10\$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'admin',
    'admin@your-domain.com'
  )
"
```

### 7.2 모니터링 지표
- 관리자 로그인 시도 횟수
- 비밀번호 초기화 빈도
- 사용자 역할 변경 이력
- 감사 로그 볼륨 및 패턴

### 7.3 백업 및 복구
```bash
# 정기 백업
0 2 * * * npx wrangler d1 backup create note-editor-v2-db

# 감사 로그 아카이빙 (월간)
0 0 1 * * npx wrangler d1 execute note-editor-v2-db --command="
  INSERT INTO audit_logs_archive SELECT * FROM audit_logs 
  WHERE created_at < datetime('now', '-90 days');
  DELETE FROM audit_logs WHERE created_at < datetime('now', '-90 days');
"
```

## 문제 해결

### 일반적인 문제

#### 1. 관리자 권한 부재
```sql
-- 사용자 역할 확인
SELECT id, username, role FROM users WHERE username = 'admin';

-- 역할 업데이트
UPDATE users SET role = 'admin' WHERE username = 'admin';
```

#### 2. 비밀번호 초기화 실패
- 이메일 설정 확인 (SMTP 서버, 포트, 자격증명)
- 사용자 이메일 주소 유효성 확인
- 감사 로그 테이블 존재 확인

#### 3. 성능 문제 (대규모 사용자)
```sql
-- 사용자 목록 조회 최적화
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- 페이지네이션 구현 확인
SELECT * FROM users 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;
```

## 다음 단계

1. `docs-v2/PUBLIC-SHARING.md` - 노트 공유 기능 구현
2. 관리자 대시보드 UI 디자인 및 구현
3. 이메일 알림 시스템 통합
4. 고급 보고서 및 분석 기능 추가

## 업데이트 기록

- 2026-04-21: 초안 작성 완료
- 2026-04-21: API 설계 및 구현 예시 추가
- 2026-04-21: 테스트 시나리오 및 보안 고려사항 추가