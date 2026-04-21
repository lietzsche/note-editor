
/**
 * 공유 토큰 생성 (예측 불가능한 32자 랜덤 문자열)
 */
export function generateShareToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 공유 토큰이 유효한지 검사하고 해당 노트 정보를 반환
 * @returns { noteId, isActive, expiresAt } 또는 null
 */
export async function validateShareToken(
  db: D1Database,
  shareToken: string
): Promise<{ noteId: string; isActive: boolean; expiresAt: string | null } | null> {
  const now = new Date().toISOString();
  const row = await db.prepare(
    `SELECT note_id, is_active, expires_at
     FROM share_tokens
     WHERE share_token = ?`
  )
    .bind(shareToken)
    .first<{ note_id: string; is_active: number; expires_at: string | null }>();
  
  if (!row) {
    return null;
  }

  const isActive = row.is_active === 1;
  const expired = row.expires_at && row.expires_at < now;

  if (!isActive || expired) {
    return null;
  }

  return {
    noteId: row.note_id,
    isActive: true,
    expiresAt: row.expires_at,
  };
}

/**
 * 공유 토큰의 접근 횟수 증가
 */
export async function incrementAccessCount(
  db: D1Database,
  shareToken: string
): Promise<void> {
  await db.prepare(
    `UPDATE share_tokens
     SET access_count = access_count + 1
     WHERE share_token = ?`
  )
    .bind(shareToken)
    .run();
}

/**
 * 노트에 대한 공유 토큰이 존재하면 반환
 * @param includeExpired 만료된 토큰도 포함할지 여부 (기본값: false)
 */
export async function getShareTokenForNote(
  db: D1Database,
  noteId: string,
  includeExpired: boolean = false
): Promise<{ shareToken: string; isActive: boolean; expiresAt: string | null; accessCount: number } | null> {
  const now = new Date().toISOString();
  let query: string;
  let params: any[];

  if (includeExpired) {
    // 만료된 토큰도 포함하여 조회
    query = `SELECT share_token, is_active, expires_at, access_count
             FROM share_tokens
             WHERE note_id = ?`;
    params = [noteId];
  } else {
    // 활성 상태이고 만료되지 않은 토큰만 조회
    query = `SELECT share_token, is_active, expires_at, access_count
             FROM share_tokens
             WHERE note_id = ? AND is_active = 1
               AND (expires_at IS NULL OR expires_at > ?)`;
    params = [noteId, now];
  }

  const row = await db.prepare(query)
    .bind(...params)
    .first<{ share_token: string; is_active: number; expires_at: string | null; access_count: number }>();
  
  if (!row) {
    return null;
  }

  return {
    shareToken: row.share_token,
    isActive: row.is_active === 1,
    expiresAt: row.expires_at,
    accessCount: row.access_count,
  };
}

/**
 * 노트에 대한 공유 토큰 생성 또는 갱신
 * @returns 새 shareToken
 */
export async function upsertShareToken(
  db: D1Database,
  noteId: string,
  expiresAt: string | null = null
): Promise<string> {
  // 기존 토큰 조회 (만료된 토큰도 포함)
  const existing = await getShareTokenForNote(db, noteId, true);
  let shareToken: string;
  
  if (existing) {
    // 기존 토큰 갱신 (활성화하고 만료일 업데이트)
    shareToken = existing.shareToken;
    await db.prepare(
      `UPDATE share_tokens
       SET expires_at = ?, is_active = 1
       WHERE note_id = ?`
    )
      .bind(expiresAt, noteId)
      .run();
  } else {
    // 새 토큰 생성
    shareToken = generateShareToken();
    await db.prepare(
      `INSERT INTO share_tokens (note_id, share_token, expires_at)
       VALUES (?, ?, ?)`
    )
      .bind(noteId, shareToken, expiresAt)
      .run();
  }
  return shareToken;
}

/**
 * 노트 공유 비활성화 (is_active = 0)
 */
export async function deactivateShareToken(
  db: D1Database,
  noteId: string
): Promise<void> {
  await db.prepare(
    `UPDATE share_tokens
     SET is_active = 0
     WHERE note_id = ?`
  )
    .bind(noteId)
    .run();
}