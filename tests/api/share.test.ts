import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { Env } from "../../functions/api/_lib/types";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

const BASE = "http://example.com";

// ── DB 초기화 헬퍼 ─────────────────────────────────────────────────────────

async function setupSchema() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS share_tokens (
      note_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      share_token TEXT NOT NULL PRIMARY KEY,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      access_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(note_id)
    )`),
  ]);
}

async function cleanDb() {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM share_tokens"),
    env.DB.prepare("DELETE FROM audit_logs"),
    env.DB.prepare("DELETE FROM login_attempts"),
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM pages"),
    env.DB.prepare("DELETE FROM groups"),
    env.DB.prepare("DELETE FROM users"),
  ]);
}

function extractCookie(res: Response): string {
  return res.headers.get("set-cookie") ?? "";
}

// ── 요청 헬퍼 ──────────────────────────────────────────────────────────────

async function signup(username: string, password: string, base = BASE) {
  return SELF.fetch(`${base}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

async function login(username: string, password: string, base = BASE) {
  return SELF.fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

async function createNote(cookie: string, body: Record<string, unknown>, base = BASE) {
  return SELF.fetch(`${base}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
}

async function enableSharing(cookie: string, noteId: string, expiresAt?: string, base = BASE) {
  return SELF.fetch(`${base}/api/notes/${noteId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(expiresAt ? { expires_at: expiresAt } : {}),
  });
}

async function disableSharing(cookie: string, noteId: string, base = BASE) {
  return SELF.fetch(`${base}/api/notes/${noteId}/share`, {
    method: "DELETE",
    headers: {
      Cookie: cookie,
    },
  });
}

async function getSharingStatus(cookie: string, noteId: string, base = BASE) {
  return SELF.fetch(`${base}/api/notes/${noteId}/share`, {
    headers: {
      Cookie: cookie,
    },
  });
}

async function getSharedNote(shareToken: string, base = BASE) {
  return SELF.fetch(`${base}/api/shared/${shareToken}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// ── 테스트 ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await setupSchema();
});

beforeEach(async () => {
  await cleanDb();
});

describe("POST /api/notes/:id/share", () => {
  it("노트 소유자가 공유를 활성화하면 공유 토큰과 URL을 반환한다", async () => {
    // 사용자 생성 및 로그인
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    // 노트 생성
    const createRes = await createNote(cookie, {
      title: "공유할 노트",
      content: "공유 본문",
    });
    expect(createRes.status).toBe(201);
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 공유 활성화
    const shareRes = await enableSharing(cookie, noteId);
    expect(shareRes.status).toBe(200);
    const shareData = await shareRes.json() as any;

    expect(shareData.data).toHaveProperty("share_token");
    expect(shareData.data.share_token).toMatch(/^[0-9a-f]{48}$/); // 24바이트 hex = 48자
    expect(shareData.data.is_active).toBe(true);
    expect(shareData.data.expires_at).toBeNull(); // 기본값: 만료 없음
    expect(shareData.data.access_count).toBe(0);
    expect(shareData.data.share_url).toBe(`/shared/${shareData.data.share_token}`);

    // DB에 실제로 저장되었는지 확인
    const dbToken = await env.DB.prepare(
      "SELECT * FROM share_tokens WHERE note_id = ?"
    ).bind(noteId).first();
    expect(dbToken).not.toBeNull();
    expect((dbToken as any).share_token).toBe(shareData.data.share_token);
    expect((dbToken as any).is_active).toBe(1);
  });

  it("만료 시간을 지정하면 expires_at 필드에 반영된다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "만료 시간 있는 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    const expiresAt = "2026-12-31T23:59:59.000Z";
    const shareRes = await enableSharing(cookie, noteId, expiresAt);
    expect(shareRes.status).toBe(200);
    const shareData = await shareRes.json() as any;

    expect(shareData.data.expires_at).toBe(expiresAt);
  });

  it("이미 공유된 노트에 대해 다시 활성화하면 기존 토큰을 갱신한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "재활성화 테스트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 첫 번째 공유 활성화
    const firstShareRes = await enableSharing(cookie, noteId);
    expect(firstShareRes.status).toBe(200);
    const firstShareData = await firstShareRes.json() as any;
    const firstToken = firstShareData.data.share_token;

    // 두 번째 공유 활성화 (만료 시간 지정)
    const newExpiresAt = "2027-01-01T00:00:00.000Z";
    const secondShareRes = await enableSharing(cookie, noteId, newExpiresAt);
    expect(secondShareRes.status).toBe(200);
    const secondShareData = await secondShareRes.json() as any;

    // 토큰은 동일해야 함
    expect(secondShareData.data.share_token).toBe(firstToken);
    expect(secondShareData.data.expires_at).toBe(newExpiresAt);

    // DB 확인
    const dbToken = await env.DB.prepare(
      "SELECT * FROM share_tokens WHERE note_id = ?"
    ).bind(noteId).first();
    expect((dbToken as any).share_token).toBe(firstToken);
    expect((dbToken as any).expires_at).toBe(newExpiresAt);
  });

  it("존재하지 않는 노트에 대해 404를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const shareRes = await enableSharing(cookie, "non-existent-note-id");
    expect(shareRes.status).toBe(404);
  });

  it("인증되지 않은 사용자는 401을 반환한다", async () => {
    const shareRes = await enableSharing("", "some-note-id");
    expect(shareRes.status).toBe(401);
  });

  it("다른 사용자의 노트를 공유할 수 없다", async () => {
    // Alice 생성
    await signup("alice", "password123");
    const aliceLoginRes = await login("alice", "password123");
    const aliceCookie = extractCookie(aliceLoginRes);

    // Alice의 노트 생성
    const createRes = await createNote(aliceCookie, {
      title: "Alice의 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // Bob 생성
    await signup("bob", "password123");
    const bobLoginRes = await login("bob", "password123");
    const bobCookie = extractCookie(bobLoginRes);

    // Bob이 Alice의 노트 공유 시도
    const shareRes = await enableSharing(bobCookie, noteId);
    expect(shareRes.status).toBe(404); // 소유권 없으므로 노트를 찾을 수 없음
  });
});

describe("DELETE /api/notes/:id/share", () => {
  it("노트 소유자가 공유를 비활성화하면 is_active가 0이 된다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "비활성화 테스트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 공유 활성화
    const enableRes = await enableSharing(cookie, noteId);
    expect(enableRes.status).toBe(200);

    // 공유 비활성화
    const disableRes = await disableSharing(cookie, noteId);
    expect(disableRes.status).toBe(204);

    // 상태 확인
    const statusRes = await getSharingStatus(cookie, noteId);
    const statusData = await statusRes.json() as any;
    expect(statusData.data.is_active).toBe(false);
    expect(statusData.data.share_token).toBeNull();

    // DB 확인
    const dbToken = await env.DB.prepare(
      "SELECT is_active FROM share_tokens WHERE note_id = ?"
    ).bind(noteId).first();
    expect((dbToken as any).is_active).toBe(0);
  });

  it("공유되지 않은 노트를 비활성화해도 204를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "공유 안한 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    const disableRes = await disableSharing(cookie, noteId);
    expect(disableRes.status).toBe(204);
  });

  it("존재하지 않는 노트에 대해 404를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const disableRes = await disableSharing(cookie, "non-existent-note-id");
    expect(disableRes.status).toBe(404);
  });

  it("인증되지 않은 사용자는 401을 반환한다", async () => {
    const disableRes = await disableSharing("", "some-note-id");
    expect(disableRes.status).toBe(401);
  });

  it("다른 사용자의 노트 공유를 비활성화할 수 없다", async () => {
    // Alice 생성
    await signup("alice", "password123");
    const aliceLoginRes = await login("alice", "password123");
    const aliceCookie = extractCookie(aliceLoginRes);

    // Alice의 노트 생성 및 공유
    const createRes = await createNote(aliceCookie, {
      title: "Alice의 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    await enableSharing(aliceCookie, noteId);

    // Bob 생성
    await signup("bob", "password123");
    const bobLoginRes = await login("bob", "password123");
    const bobCookie = extractCookie(bobLoginRes);

    // Bob이 Alice의 노트 공유 비활성화 시도
    const disableRes = await disableSharing(bobCookie, noteId);
    expect(disableRes.status).toBe(404);
  });
});

describe("GET /api/notes/:id/share", () => {
  it("공유된 노트의 상태 정보를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "상태 조회 테스트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 공유 활성화
    const enableRes = await enableSharing(cookie, noteId);
    const enableData = await enableRes.json() as any;
    const shareToken = enableData.data.share_token;

    // 상태 조회
    const statusRes = await getSharingStatus(cookie, noteId);
    expect(statusRes.status).toBe(200);
    const statusData = await statusRes.json() as any;

    expect(statusData.data).toEqual({
      share_token: shareToken,
      is_active: true,
      expires_at: null,
      access_count: 0,
      share_url: `/shared/${shareToken}`,
    });
  });

  it("공유되지 않은 노트의 상태는 is_active: false를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "공유 안한 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    const statusRes = await getSharingStatus(cookie, noteId);
    expect(statusRes.status).toBe(200);
    const statusData = await statusRes.json() as any;

    expect(statusData.data).toEqual({
      share_token: null,
      is_active: false,
      expires_at: null,
      access_count: 0,
      share_url: null,
    });
  });

  it("비활성화된 공유 노트의 상태는 is_active: false를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "비활성화된 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 공유 활성화 후 비활성화
    await enableSharing(cookie, noteId);
    await disableSharing(cookie, noteId);

    const statusRes = await getSharingStatus(cookie, noteId);
    const statusData = await statusRes.json() as any;

    expect(statusData.data.is_active).toBe(false);
    expect(statusData.data.share_token).toBeNull();
  });

  it("존재하지 않는 노트에 대해 404를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const statusRes = await getSharingStatus(cookie, "non-existent-note-id");
    expect(statusRes.status).toBe(404);
  });

  it("인증되지 않은 사용자는 401을 반환한다", async () => {
    const statusRes = await getSharingStatus("", "some-note-id");
    expect(statusRes.status).toBe(401);
  });

  it("다른 사용자의 노트 상태를 조회할 수 없다", async () => {
    // Alice 생성
    await signup("alice", "password123");
    const aliceLoginRes = await login("alice", "password123");
    const aliceCookie = extractCookie(aliceLoginRes);

    // Alice의 노트 생성
    const createRes = await createNote(aliceCookie, {
      title: "Alice의 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // Bob 생성
    await signup("bob", "password123");
    const bobLoginRes = await login("bob", "password123");
    const bobCookie = extractCookie(bobLoginRes);

    // Bob이 Alice의 노트 상태 조회 시도
    const statusRes = await getSharingStatus(bobCookie, noteId);
    expect(statusRes.status).toBe(404);
  });
});

describe("GET /api/shared/:shareToken", () => {
  it("유효한 공유 토큰으로 노트를 읽을 수 있다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "공유된 노트",
      content: "공유 본문 내용",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 공유 활성화
    const enableRes = await enableSharing(cookie, noteId);
    const enableData = await enableRes.json() as any;
    const shareToken = enableData.data.share_token;

    // 공유된 노트 읽기 (인증 없이)
    const sharedRes = await getSharedNote(shareToken);
    expect(sharedRes.status).toBe(200);
    const sharedData = await sharedRes.json() as any;

    expect(sharedData.data).toMatchObject({
      id: noteId,
      title: "공유된 노트",
      content: "공유 본문 내용",
      shared: true,
    });
    expect(sharedData.data).toHaveProperty("group_id");
    expect(sharedData.data).toHaveProperty("sort_order");
    expect(sharedData.data).toHaveProperty("updated_at");

    // 접근 횟수 증가 확인
    const dbToken = await env.DB.prepare(
      "SELECT access_count FROM share_tokens WHERE share_token = ?"
    ).bind(shareToken).first();
    expect((dbToken as any).access_count).toBe(1);
  });

  it("만료된 공유 토큰은 404를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "만료된 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 과거 만료 시간으로 공유 활성화
    const pastExpiresAt = "2020-01-01T00:00:00.000Z";
    const enableRes = await enableSharing(cookie, noteId, pastExpiresAt);
    const enableData = await enableRes.json() as any;
    const shareToken = enableData.data.share_token;

    // 만료된 토큰으로 접근
    const sharedRes = await getSharedNote(shareToken);
    expect(sharedRes.status).toBe(404);
  });

  it("비활성화된 공유 토큰은 404를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "비활성화된 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 공유 활성화 후 비활성화
    const enableRes = await enableSharing(cookie, noteId);
    const enableData = await enableRes.json() as any;
    const shareToken = enableData.data.share_token;

    await disableSharing(cookie, noteId);

    // 비활성화된 토큰으로 접근
    const sharedRes = await getSharedNote(shareToken);
    expect(sharedRes.status).toBe(404);
  });

  it("존재하지 않는 공유 토큰은 404를 반환한다", async () => {
    const sharedRes = await getSharedNote("non-existent-token");
    expect(sharedRes.status).toBe(404);
  });

  it("삭제된 노트의 공유 토큰은 404를 반환한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "삭제될 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 공유 활성화
    const enableRes = await enableSharing(cookie, noteId);
    const enableData = await enableRes.json() as any;
    const shareToken = enableData.data.share_token;

    // 노트 삭제
    await SELF.fetch(`${BASE}/api/notes/${noteId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });

    // 삭제된 노트의 토큰으로 접근
    const sharedRes = await getSharedNote(shareToken);
    expect(sharedRes.status).toBe(404);
  });

  it("여러 번 접근하면 접근 횟수가 증가한다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "접근 횟수 테스트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 공유 활성화
    const enableRes = await enableSharing(cookie, noteId);
    const enableData = await enableRes.json() as any;
    const shareToken = enableData.data.share_token;

    // 3번 접근
    for (let i = 0; i < 3; i++) {
      const sharedRes = await getSharedNote(shareToken);
      expect(sharedRes.status).toBe(200);
    }

    // 접근 횟수 확인
    const dbToken = await env.DB.prepare(
      "SELECT access_count FROM share_tokens WHERE share_token = ?"
    ).bind(shareToken).first();
    expect((dbToken as any).access_count).toBe(3);
  });
});

describe("공유 기능 통합 테스트", () => {
  it("공유 활성화 → 상태 조회 → 공유된 노트 읽기 → 비활성화 전체 흐름", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    // 노트 생성
    const createRes = await createNote(cookie, {
      title: "통합 테스트 노트",
      content: "통합 테스트 본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 1. 공유 활성화
    const enableRes = await enableSharing(cookie, noteId);
    expect(enableRes.status).toBe(200);
    const enableData = await enableRes.json() as any;
    const shareToken = enableData.data.share_token;
    expect(enableData.data.is_active).toBe(true);

    // 2. 상태 조회 확인
    const statusRes = await getSharingStatus(cookie, noteId);
    const statusData = await statusRes.json() as any;
    expect(statusData.data.share_token).toBe(shareToken);
    expect(statusData.data.is_active).toBe(true);

    // 3. 공유된 노트 읽기 (인증 없이)
    const sharedRes = await getSharedNote(shareToken);
    expect(sharedRes.status).toBe(200);
    const sharedData = await sharedRes.json() as any;
    expect(sharedData.data.title).toBe("통합 테스트 노트");
    expect(sharedData.data.content).toBe("통합 테스트 본문");
    expect(sharedData.data.shared).toBe(true);

    // 4. 공유 비활성화
    const disableRes = await disableSharing(cookie, noteId);
    expect(disableRes.status).toBe(204);

    // 5. 비활성화 후 상태 확인
    const afterStatusRes = await getSharingStatus(cookie, noteId);
    const afterStatusData = await afterStatusRes.json() as any;
    expect(afterStatusData.data.is_active).toBe(false);
    expect(afterStatusData.data.share_token).toBeNull();

    // 6. 비활성화 후 공유된 노트 읽기 불가
    const afterSharedRes = await getSharedNote(shareToken);
    expect(afterSharedRes.status).toBe(404);
  });

  it("만료 시간이 지나면 공유된 노트를 읽을 수 없다", async () => {
    await signup("alice", "password123");
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "만료 테스트 노트",
      content: "본문",
    });
    const note = await createRes.json() as any;
    const noteId = note.data.id;

    // 1초 후 만료되는 공유 토큰 생성
    const expiresAt = new Date(Date.now() + 1000).toISOString(); // 1초 후
    const enableRes = await enableSharing(cookie, noteId, expiresAt);
    const enableData = await enableRes.json() as any;
    const shareToken = enableData.data.share_token;

    // 즉시 접근 시 성공
    const immediateRes = await getSharedNote(shareToken);
    expect(immediateRes.status).toBe(200);

    // 2초 대기 후 접근 시 실패
    await new Promise(resolve => setTimeout(resolve, 2000));
    const afterExpiryRes = await getSharedNote(shareToken);
    expect(afterExpiryRes.status).toBe(404);
  });
});