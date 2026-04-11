import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { Env } from "../../functions/api/_lib/types";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

const BASE = "http://example.com";
const SECURE_BASE = "https://example.com";

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
  ]);
}

async function cleanDb() {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM audit_logs"),
    env.DB.prepare("DELETE FROM login_attempts"),
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM pages"),
    env.DB.prepare("DELETE FROM groups"),
    env.DB.prepare("DELETE FROM users"),
  ]);
}

async function logout(cookie: string, base = BASE) {
  return SELF.fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
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

async function me(cookie: string, base = BASE) {
  return SELF.fetch(`${base}/api/auth/me`, {
    headers: { Cookie: cookie },
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

async function listNotes(cookie: string, base = BASE) {
  return SELF.fetch(`${base}/api/notes`, {
    headers: { Cookie: cookie },
  });
}

// ── 테스트 ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await setupSchema();
});

beforeEach(async () => {
  await cleanDb();
});

describe("POST /api/auth/signup", () => {
  it("유효한 입력으로 가입 성공 후 201을 반환한다", async () => {
    const res = await signup("alice", "password123");
    expect(res.status).toBe(201);
    const body = await res.json() as any;
    expect(body.data.username).toBe("alice");
  });

  it("중복 username은 409를 반환한다", async () => {
    await signup("alice", "password123");
    const res = await signup("alice", "other123");
    expect(res.status).toBe(409);
  });

  it("username이 1자면 400을 반환한다", async () => {
    const res = await signup("a", "password123");
    expect(res.status).toBe(400);
  });

  it("password가 5자면 400을 반환한다", async () => {
    const res = await signup("alice", "12345");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await signup("alice", "password123");
  });

  it("정상 자격증명으로 로그인 성공 후 200을 반환한다", async () => {
    const res = await login("alice", "password123");
    expect(res.status).toBe(200);
  });

  it("잘못된 비밀번호는 401을 반환한다", async () => {
    const res = await login("alice", "wrongpassword");
    expect(res.status).toBe(401);
  });

  it("존재하지 않는 username은 401을 반환한다", async () => {
    const res = await login("nobody", "password123");
    expect(res.status).toBe(401);
  });

  // ── Rate limiting (Red: 아직 미구현 → 실패 예상) ───────────────────────
  it("5회 연속 실패 후 6번째 시도는 429를 반환한다", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await login("alice", "wrong");
      expect(res.status).toBe(401);
    }
    const res = await login("alice", "wrong");
    expect(res.status).toBe(429);
    const body = await res.json() as any;
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("rate limit 상태에서도 올바른 비밀번호는 429를 반환한다", async () => {
    for (let i = 0; i < 5; i++) {
      await login("alice", "wrong");
    }
    // 차단 중이므로 정상 비밀번호도 429
    const res = await login("alice", "password123");
    expect(res.status).toBe(429);
  });
});

describe("GET /api/auth/me", () => {
  it("세션 없이 호출하면 401을 반환한다", async () => {
    const res = await SELF.fetch(`${BASE}/api/auth/me`);
    expect(res.status).toBe(401);
  });
});

// ── 감사 로그 (Red: 미구현 → 실패 예상) ───────────────────────────────────
describe("감사 로그 (Audit Logs)", () => {
  beforeEach(async () => {
    await signup("alice", "password123");
  });

  it("로그인 성공 시 login_success 이벤트가 기록된다", async () => {
    await login("alice", "password123");
    const log = await env.DB.prepare(
      "SELECT * FROM audit_logs WHERE username = ? AND event_type = 'login_success'"
    ).bind("alice").first();
    expect(log).not.toBeNull();
  });

  it("로그인 실패 시 login_failure 이벤트가 기록된다", async () => {
    await login("alice", "wrongpassword");
    const log = await env.DB.prepare(
      "SELECT * FROM audit_logs WHERE username = ? AND event_type = 'login_failure'"
    ).bind("alice").first();
    expect(log).not.toBeNull();
  });

  it("로그아웃 시 logout 이벤트가 기록된다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);
    await logout(cookie);
    const log = await env.DB.prepare(
      "SELECT * FROM audit_logs WHERE username = ? AND event_type = 'logout'"
    ).bind("alice").first();
    expect(log).not.toBeNull();
  });
});

describe("TS-01 신규 사용자 온보딩", () => {
  it("회원가입 후 로그인하고 노트를 생성하면 목록에 즉시 반영된다", async () => {
    const signupRes = await signup("alice", "password123");
    expect(signupRes.status).toBe(201);

    const loginRes = await login("alice", "password123");
    expect(loginRes.status).toBe(200);
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "첫 노트",
      content: "온보딩 테스트",
    });
    expect(createRes.status).toBe(201);

    const listRes = await listNotes(cookie);
    expect(listRes.status).toBe(200);
    const body = await listRes.json() as any;
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe("첫 노트");
    expect(body.data[0].content).toBe("온보딩 테스트");
  });
});

describe("TS-05 세션/보호 API", () => {
  beforeEach(async () => {
    await signup("alice", "password123");
  });

  it("로그인 후 보호 API 호출 성공, 로그아웃 후 차단, 재로그인 후 복구된다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const meRes = await me(cookie);
    expect(meRes.status).toBe(200);

    const logoutRes = await logout(cookie);
    expect(logoutRes.status).toBe(204);

    const afterLogoutRes = await me(cookie);
    expect(afterLogoutRes.status).toBe(401);

    const reloginRes = await login("alice", "password123");
    const newCookie = extractCookie(reloginRes);
    const recoveredRes = await me(newCookie);
    expect(recoveredRes.status).toBe(200);
  });

  it("http 요청의 세션 쿠키는 HttpOnly와 SameSite=Lax를 포함한다", async () => {
    const res = await login("alice", "password123");
    const cookie = extractCookie(res);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("https 요청의 세션 쿠키는 Secure를 포함한다", async () => {
    const res = await login("alice", "password123", SECURE_BASE);
    const cookie = extractCookie(res);
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });
});
