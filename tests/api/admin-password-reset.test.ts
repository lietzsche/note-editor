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
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_password_resets (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      admin_username TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      target_username TEXT NOT NULL,
      reset_mode TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`),
  ]);
}

async function cleanDb() {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_password_resets"),
    env.DB.prepare("DELETE FROM audit_logs"),
    env.DB.prepare("DELETE FROM login_attempts"),
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM pages"),
    env.DB.prepare("DELETE FROM groups"),
    env.DB.prepare("DELETE FROM users"),
  ]);
}

function extractCookie(res: Response) {
  return res.headers.get("set-cookie") ?? "";
}

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

async function changePassword(
  cookie: string,
  currentPassword: string,
  newPassword: string,
  base = BASE
) {
  return SELF.fetch(`${base}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

async function listAdminUsers(cookie: string, search?: string, base = BASE) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return SELF.fetch(`${base}/api/admin/users${qs}`, {
    headers: { Cookie: cookie },
  });
}

async function resetPassword(cookie: string, userId: string, base = BASE) {
  return SELF.fetch(`${base}/api/admin/users/${userId}/password-reset`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
}

async function listPasswordResetAudit(cookie: string, base = BASE) {
  return SELF.fetch(`${base}/api/admin/audit/password-resets`, {
    headers: { Cookie: cookie },
  });
}

beforeAll(async () => {
  await setupSchema();
});

beforeEach(async () => {
  await cleanDb();
  env.ADMIN_USERNAMES = "admin";
});

describe("FEATURE-009 admin password reset", () => {
  it("requires authentication for admin routes", async () => {
    const res = await SELF.fetch(`${BASE}/api/admin/users`);
    expect(res.status).toBe(401);
  });

  it("blocks non-admin users from admin routes", async () => {
    const userRes = await signup("alice", "password123");
    const userCookie = extractCookie(userRes);

    const res = await listAdminUsers(userCookie);
    expect(res.status).toBe(403);
  });

  it("lists users and supports username search for admins", async () => {
    const adminRes = await signup("admin", "password123");
    const adminCookie = extractCookie(adminRes);
    await signup("alice", "password123");
    await signup("bob", "password123");

    const listRes = await listAdminUsers(adminCookie);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as any;
    expect(listBody.data.map((user: any) => user.username)).toEqual(["admin", "alice", "bob"]);

    const searchRes = await listAdminUsers(adminCookie, "ali");
    expect(searchRes.status).toBe(200);
    const searchBody = await searchRes.json() as any;
    expect(searchBody.data.map((user: any) => user.username)).toEqual(["alice"]);
  });

  it("resets a user's password, clears sessions, and records audit", async () => {
    const adminRes = await signup("admin", "password123");
    const adminCookie = extractCookie(adminRes);

    const userRes = await signup("alice", "password123");
    const userCookie = extractCookie(userRes);
    const user = await env.DB.prepare(
      "SELECT id FROM users WHERE username = ?"
    ).bind("alice").first<{ id: string }>();
    expect(user?.id).toBeTruthy();

    await login("alice", "wrongpassword");
    const attemptsBeforeReset = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM login_attempts WHERE username = ?"
    ).bind("alice").first<{ cnt: number }>();
    expect(attemptsBeforeReset?.cnt).toBe(1);

    const resetRes = await resetPassword(adminCookie, user!.id);
    expect(resetRes.status).toBe(200);
    const resetBody = await resetRes.json() as any;
    expect(resetBody.data.username).toBe("alice");
    expect(resetBody.data.resetBy).toBe("admin");
    expect(typeof resetBody.data.tempPassword).toBe("string");
    expect(resetBody.data.tempPassword.length).toBeGreaterThanOrEqual(16);

    const oldSessionRes = await me(userCookie);
    expect(oldSessionRes.status).toBe(401);

    const attemptsAfterReset = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM login_attempts WHERE username = ?"
    ).bind("alice").first<{ cnt: number }>();
    expect(attemptsAfterReset?.cnt).toBe(0);

    const oldPasswordLoginRes = await login("alice", "password123");
    expect(oldPasswordLoginRes.status).toBe(401);

    const tempLoginResA = await login("alice", resetBody.data.tempPassword);
    expect(tempLoginResA.status).toBe(200);
    const tempLoginBodyA = await tempLoginResA.json() as any;
    expect(tempLoginBodyA.data.passwordChangeRequired).toBe(true);
    const tempCookieA = extractCookie(tempLoginResA);

    const tempLoginResB = await login("alice", resetBody.data.tempPassword);
    expect(tempLoginResB.status).toBe(200);
    const tempCookieB = extractCookie(tempLoginResB);

    const tempMeRes = await me(tempCookieA);
    expect(tempMeRes.status).toBe(200);
    const tempMeBody = await tempMeRes.json() as any;
    expect(tempMeBody.data.passwordChangeRequired).toBe(true);

    const changeRes = await changePassword(
      tempCookieA,
      resetBody.data.tempPassword,
      "newPassword456"
    );
    expect(changeRes.status).toBe(200);
    const changeBody = await changeRes.json() as any;
    expect(changeBody.data.passwordChangeRequired).toBe(false);

    const survivingSessionRes = await me(tempCookieA);
    expect(survivingSessionRes.status).toBe(200);
    const survivingSessionBody = await survivingSessionRes.json() as any;
    expect(survivingSessionBody.data.passwordChangeRequired).toBe(false);

    const invalidatedOtherSessionRes = await me(tempCookieB);
    expect(invalidatedOtherSessionRes.status).toBe(401);

    const tempPasswordLoginRes = await login("alice", resetBody.data.tempPassword);
    expect(tempPasswordLoginRes.status).toBe(401);

    const newPasswordLoginRes = await login("alice", "newPassword456");
    expect(newPasswordLoginRes.status).toBe(200);
    const newPasswordLoginBody = await newPasswordLoginRes.json() as any;
    expect(newPasswordLoginBody.data.passwordChangeRequired).toBe(false);

    const auditRes = await listPasswordResetAudit(adminCookie);
    expect(auditRes.status).toBe(200);
    const auditBody = await auditRes.json() as any;
    expect(auditBody.data).toHaveLength(1);
    expect(auditBody.data[0].admin_username).toBe("admin");
    expect(auditBody.data[0].target_username).toBe("alice");
    expect(auditBody.data[0].reset_mode).toBe("generated");
  });

  it("returns 404 when the admin resets a missing user", async () => {
    const adminRes = await signup("admin", "password123");
    const adminCookie = extractCookie(adminRes);

    const resetRes = await resetPassword(adminCookie, "missing-user-id");
    expect(resetRes.status).toBe(404);
  });

  it("blocks admins from resetting their own account", async () => {
    const adminRes = await signup("admin", "password123");
    const adminCookie = extractCookie(adminRes);
    const adminUser = await env.DB.prepare(
      "SELECT id FROM users WHERE username = ?"
    ).bind("admin").first<{ id: string }>();

    const resetRes = await resetPassword(adminCookie, adminUser!.id);
    expect(resetRes.status).toBe(422);
    const body = await resetRes.json() as any;
    expect(body.error.code).toBe("SELF_RESET_FORBIDDEN");
  });
});
