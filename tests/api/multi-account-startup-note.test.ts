import { SELF, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../../functions/api/_lib/types";

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {}
}

const BASE = "http://example.com";

async function setupSchema() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_reset_required INTEGER NOT NULL DEFAULT 0,
      startup_note_id TEXT REFERENCES pages(id) ON DELETE SET NULL,
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
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

function extractCookiePair(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0] ?? "";
}

async function signup(username: string, password: string, cookie?: string) {
  const res = await SELF.fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ username, password }),
  });
  return { res, cookie: extractCookiePair(res) };
}

async function login(username: string, password: string, cookie?: string) {
  const res = await SELF.fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ username, password }),
  });
  return { res, cookie: extractCookiePair(res) };
}

async function createNote(cookie: string, title: string, content = "") {
  const res = await SELF.fetch(`${BASE}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ title, content }),
  });
  const json = await res.json<{ data: { id: string; title: string } }>();
  return json.data;
}

beforeAll(async () => {
  await setupSchema();
});

beforeEach(async () => {
  await cleanDb();
});

describe("Startup note API", () => {
  it("sets, reads, and clears startup note per user and auto-clears on trash", async () => {
    const { cookie } = await signup("alice", "password123");
    const note = await createNote(cookie, "데일리 노트", "오늘 할 일");

    const setRes = await SELF.fetch(`${BASE}/api/auth/startup-note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ noteId: note.id }),
    });
    expect(setRes.status).toBe(200);
    const setJson = await setRes.json<{ data: { startupNoteId: string | null } }>();
    expect(setJson.data.startupNoteId).toBe(note.id);

    const meRes = await SELF.fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    const meJson = await meRes.json<{ data: { startupNoteId: string | null } }>();
    expect(meJson.data.startupNoteId).toBe(note.id);

    // 휴지통 이동 시 시작 노트 자동 해제
    const trashRes = await SELF.fetch(`${BASE}/api/notes/${note.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(trashRes.status).toBe(204);

    const meAfterTrash = await SELF.fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    const meAfterTrashJson = await meAfterTrash.json<{ data: { startupNoteId: string | null } }>();
    expect(meAfterTrashJson.data.startupNoteId).toBeNull();

    // 휴지통 노트는 시작 노트로 지정할 수 없음
    const setTrashedRes = await SELF.fetch(`${BASE}/api/auth/startup-note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ noteId: note.id }),
    });
    expect(setTrashedRes.status).toBe(409);
  });

  it("rejects setting another user's note as startup note", async () => {
    const alice = await signup("alice", "password123");
    const bob = await signup("bob", "password123");
    const bobNote = await createNote(bob.cookie, "밥의 노트");

    const res = await SELF.fetch(`${BASE}/api/auth/startup-note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: alice.cookie },
      body: JSON.stringify({ noteId: bobNote.id }),
    });
    expect(res.status).toBe(404);
  });
});

describe("Multi-account login, switching, and partial/full logout API", () => {
  it("supports multi-login, switching with per-account startup note, current-only logout, and logout all", async () => {
    // 1. personal 계정 가입 및 시작 노트 지정
    const personal = await signup("personal", "password123");
    expect(personal.res.status).toBe(201);
    const personalJson = await personal.res.json<{ data: { userId: string } }>();
    const personalNote = await createNote(personal.cookie, "개인 고정 노트");
    await SELF.fetch(`${BASE}/api/auth/startup-note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: personal.cookie },
      body: JSON.stringify({ noteId: personalNote.id }),
    });

    // 2. 기존 쿠키를 유지한 채 work 계정 추가 가입(로그인)
    const work = await signup("work", "password123", personal.cookie);
    expect(work.res.status).toBe(201);
    const workJson = await work.res.json<{
      data: {
        userId: string;
        username: string;
        accounts: Array<{ userId: string; username: string; isActive: boolean }>;
      };
    }>();
    expect(workJson.data.username).toBe("work");
    expect(workJson.data.accounts).toHaveLength(2);
    expect(workJson.data.accounts.find((a) => a.username === "work")?.isActive).toBe(true);
    expect(workJson.data.accounts.find((a) => a.username === "personal")?.isActive).toBe(false);

    const workNote = await createNote(work.cookie, "업무 고정 노트");
    await SELF.fetch(`${BASE}/api/auth/startup-note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: work.cookie },
      body: JSON.stringify({ noteId: workNote.id }),
    });

    // 3. personal 계정으로 1클릭 전환
    const switchRes = await SELF.fetch(`${BASE}/api/auth/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: work.cookie },
      body: JSON.stringify({ userId: personalJson.data.userId }),
    });
    expect(switchRes.status).toBe(200);
    const switchedCookie = extractCookiePair(switchRes);
    const switchedJson = await switchRes.json<{
      data: { username: string; startupNoteId: string | null; accounts: unknown[] };
    }>();
    expect(switchedJson.data.username).toBe("personal");
    expect(switchedJson.data.startupNoteId).toBe(personalNote.id);
    expect(switchedJson.data.accounts).toHaveLength(2);

    // 노트 목록 격리 확인
    const personalNotesRes = await SELF.fetch(`${BASE}/api/notes`, {
      headers: { Cookie: switchedCookie },
    });
    const personalNotesJson = await personalNotesRes.json<{ data: Array<{ id: string }> }>();
    expect(personalNotesJson.data.map((n) => n.id)).toEqual([personalNote.id]);

    // 4. 현재 계정(personal)만 로그아웃 -> work 계정으로 자동 전환
    const partialLogoutRes = await SELF.fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: switchedCookie },
    });
    expect(partialLogoutRes.status).toBe(200);
    const afterPartialCookie = extractCookiePair(partialLogoutRes);
    const afterPartialJson = await partialLogoutRes.json<{
      data: { username: string; startupNoteId: string | null; accounts: Array<{ username: string }> };
    }>();
    expect(afterPartialJson.data.username).toBe("work");
    expect(afterPartialJson.data.startupNoteId).toBe(workNote.id);
    expect(afterPartialJson.data.accounts.map((a) => a.username)).toEqual(["work"]);

    // 5. 다시 personal 추가 로그인 후 scope: "all"로 전체 로그아웃
    const relogin = await login("personal", "password123", afterPartialCookie);
    expect(relogin.res.status).toBe(200);

    const logoutAllRes = await SELF.fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: relogin.cookie },
      body: JSON.stringify({ scope: "all" }),
    });
    expect(logoutAllRes.status).toBe(204);

    // 기존 쿠키 세션 모두 D1에서 폐기되었는지 확인
    const meAfterAll = await SELF.fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: relogin.cookie },
    });
    expect(meAfterAll.status).toBe(401);
  });

  it("enforces maximum 5 concurrent logged-in accounts per browser", async () => {
    let cookie = "";
    for (let i = 1; i <= 5; i += 1) {
      const result = await signup(`user${i}`, "password123", cookie || undefined);
      expect(result.res.status).toBe(201);
      cookie = result.cookie;
    }

    // 6번째 계정은 409 MAX_SESSIONS_REACHED 반환
    const sixth = await signup("user6", "password123", cookie);
    expect(sixth.res.status).toBe(409);
    const sixthJson = await sixth.res.json<{ error: { code: string } }>();
    expect(sixthJson.error.code).toBe("MAX_SESSIONS_REACHED");
  });
});
