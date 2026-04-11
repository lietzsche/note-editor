import { Hono } from "hono";
import type { Env } from "./_lib/types";
import {
  createSession,
  getSession,
  clearSession,
  hashPassword,
} from "./_lib/auth";
import {
  ok,
  created,
  noContent,
  err,
  unauthorized,
  notFound,
  forbidden,
} from "./_lib/response";

const app = new Hono<{ Bindings: Env }>();

// ── Auth routes ────────────────────────────────────────────────────────────

app.post("/api/auth/signup", async (c) => {
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  if (!username || username.length < 2 || username.length > 40)
    return err("VALIDATION", "username은 2~40자여야 합니다.");
  if (!password || password.length < 6)
    return err("VALIDATION", "password는 6자 이상이어야 합니다.");

  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username = ?"
  )
    .bind(username)
    .first();
  if (existing) return err("CONFLICT", "이미 사용 중인 username입니다.", 409);

  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(id, username, password_hash, now)
    .run();

  // 기본 그룹(미분류) 자동 생성
  const groupId = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO groups (id, user_id, name, position, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)"
  )
    .bind(groupId, id, "미분류", now, now)
    .run();

  await createSession(c, { userId: id, username });
  return c.json({ data: { username } }, 201);
});

// 5분 윈도우, 최대 5회 실패 시 차단
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

app.post("/api/auth/login", async (c) => {
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();

  if (!username || !password)
    return err("VALIDATION", "username과 password를 입력하세요.");

  // Rate limit 확인
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const attempts = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM login_attempts WHERE username = ? AND attempted_at > ?"
  )
    .bind(username, windowStart)
    .first<{ cnt: number }>();

  if ((attempts?.cnt ?? 0) >= RATE_LIMIT_MAX)
    return err("RATE_LIMITED", "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.", 429);

  const user = await c.env.DB.prepare(
    "SELECT id, username, password_hash FROM users WHERE username = ?"
  )
    .bind(username)
    .first<{ id: string; username: string; password_hash: string }>();

  if (!user) {
    await recordLoginAttempt(c.env.DB, username);
    await recordAuditLog(c.env.DB, "login_failure", username);
    return err("AUTH_FAILED", "자격증명이 잘못되었습니다.", 401);
  }

  const hash = await hashPassword(password);
  if (hash !== user.password_hash) {
    await recordLoginAttempt(c.env.DB, username);
    await recordAuditLog(c.env.DB, "login_failure", username);
    return err("AUTH_FAILED", "자격증명이 잘못되었습니다.", 401);
  }

  await createSession(c, { userId: user.id, username: user.username });
  await recordAuditLog(c.env.DB, "login_success", username);
  return c.json({ data: { username: user.username } }, 200);
});

async function recordLoginAttempt(db: D1Database, username: string) {
  await db
    .prepare(
      "INSERT INTO login_attempts (id, username, attempted_at) VALUES (?, ?, ?)"
    )
    .bind(crypto.randomUUID(), username, new Date().toISOString())
    .run();
}

async function recordAuditLog(db: D1Database, eventType: string, username: string) {
  await db
    .prepare(
      "INSERT INTO audit_logs (id, event_type, username, created_at) VALUES (?, ?, ?, ?)"
    )
    .bind(crypto.randomUUID(), eventType, username, new Date().toISOString())
    .run();
}

app.post("/api/auth/logout", async (c) => {
  const session = await getSession(c);
  await clearSession(c, session?.sessionId);
  if (session) {
    await recordAuditLog(c.env.DB, "logout", session.username);
  }
  return c.newResponse(null, 204);
});

app.get("/api/auth/me", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();
  return ok({ username: session.username });
});

// ── Groups routes ──────────────────────────────────────────────────────────

app.get("/api/groups", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const { results } = await c.env.DB.prepare(
    "SELECT id, name, position FROM groups WHERE user_id = ? ORDER BY position ASC"
  )
    .bind(session.userId)
    .all<{ id: string; name: string; position: number }>();

  return ok(results);
});

app.post("/api/groups", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const { name } = await c.req.json<{ name: string }>();
  if (!name || name.length < 1 || name.length > 40)
    return err("VALIDATION", "그룹명은 1~40자여야 합니다.");

  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM groups WHERE user_id = ?"
  )
    .bind(session.userId)
    .first<{ cnt: number }>();
  if ((count?.cnt ?? 0) >= 30)
    return err("LIMIT", "그룹은 최대 30개까지 생성할 수 있습니다.", 422);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const maxPos = await c.env.DB.prepare(
    "SELECT COALESCE(MAX(position), -1) as pos FROM groups WHERE user_id = ?"
  )
    .bind(session.userId)
    .first<{ pos: number }>();
  const position = (maxPos?.pos ?? -1) + 1;

  await c.env.DB.prepare(
    "INSERT INTO groups (id, user_id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, session.userId, name, position, now, now)
    .run();

  return created({ id, name, position });
});

app.delete("/api/groups/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const groupId = c.req.param("id");
  const group = await c.env.DB.prepare(
    "SELECT id, name FROM groups WHERE id = ? AND user_id = ?"
  )
    .bind(groupId, session.userId)
    .first<{ id: string; name: string }>();

  if (!group) return notFound();
  if (group.name === "미분류")
    return err("FORBIDDEN", "기본 그룹(미분류)은 삭제할 수 없습니다.", 403);

  const defaultGroup = await c.env.DB.prepare(
    "SELECT id FROM groups WHERE user_id = ? AND name = '미분류'"
  )
    .bind(session.userId)
    .first<{ id: string }>();

  if (defaultGroup) {
    await c.env.DB.prepare(
      "UPDATE pages SET group_id = ? WHERE group_id = ? AND user_id = ?"
    )
      .bind(defaultGroup.id, groupId, session.userId)
      .run();
  }

  await c.env.DB.prepare("DELETE FROM groups WHERE id = ? AND user_id = ?")
    .bind(groupId, session.userId)
    .run();

  return noContent();
});

// ── Notes routes ───────────────────────────────────────────────────────────

app.get("/api/notes", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const groupId = c.req.query("group_id");
  let query: D1PreparedStatement;

  if (groupId) {
    query = c.env.DB.prepare(
      "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE user_id = ? AND group_id = ? ORDER BY sort_order ASC"
    ).bind(session.userId, groupId);
  } else {
    query = c.env.DB.prepare(
      "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE user_id = ? ORDER BY sort_order ASC"
    ).bind(session.userId);
  }

  const { results } = await query.all();
  return ok(results);
});

app.post("/api/notes", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const { title = "", content = "", group_id } = await c.req.json<{
    title?: string;
    content?: string;
    group_id?: string;
  }>();

  // group_id 소유권 검증
  let resolvedGroupId = group_id ?? null;
  if (resolvedGroupId) {
    const g = await c.env.DB.prepare(
      "SELECT id FROM groups WHERE id = ? AND user_id = ?"
    )
      .bind(resolvedGroupId, session.userId)
      .first();
    if (!g) return forbidden();
  } else {
    const defaultGroup = await c.env.DB.prepare(
      "SELECT id FROM groups WHERE user_id = ? AND name = '미분류'"
    )
      .bind(session.userId)
      .first<{ id: string }>();
    resolvedGroupId = defaultGroup?.id ?? null;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const maxOrder = await c.env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) as ord FROM pages WHERE user_id = ?"
  )
    .bind(session.userId)
    .first<{ ord: number }>();
  const sort_order = (maxOrder?.ord ?? -1) + 1;

  await c.env.DB.prepare(
    "INSERT INTO pages (id, user_id, group_id, title, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, session.userId, resolvedGroupId, title, content, sort_order, now, now)
    .run();

  return created({ id, title, content, group_id: resolvedGroupId, sort_order });
});

app.get("/api/notes/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const note = await c.env.DB.prepare(
    "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(c.req.param("id"), session.userId)
    .first();

  if (!note) return notFound();
  return ok(note);
});

app.patch("/api/notes/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const note = await c.env.DB.prepare(
    "SELECT id FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(c.req.param("id"), session.userId)
    .first();
  if (!note) return notFound();

  const body = await c.req.json<{
    title?: string;
    content?: string;
    group_id?: string | null;
  }>();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.title !== undefined) { fields.push("title = ?"); values.push(body.title); }
  if (body.content !== undefined) { fields.push("content = ?"); values.push(body.content); }
  if (body.group_id !== undefined) {
    if (body.group_id !== null) {
      const g = await c.env.DB.prepare(
        "SELECT id FROM groups WHERE id = ? AND user_id = ?"
      )
        .bind(body.group_id, session.userId)
        .first();
      if (!g) return forbidden();
    }
    fields.push("group_id = ?");
    values.push(body.group_id);
  }

  if (fields.length === 0) return err("VALIDATION", "수정할 필드가 없습니다.");

  const now = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(now);
  values.push(c.req.param("id"));
  values.push(session.userId);

  await c.env.DB.prepare(
    `UPDATE pages SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`
  )
    .bind(...values)
    .run();

  const updated = await c.env.DB.prepare(
    "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE id = ?"
  )
    .bind(c.req.param("id"))
    .first();

  return ok(updated);
});

app.delete("/api/notes/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const note = await c.env.DB.prepare(
    "SELECT id FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(c.req.param("id"), session.userId)
    .first();
  if (!note) return notFound();

  await c.env.DB.prepare("DELETE FROM pages WHERE id = ? AND user_id = ?")
    .bind(c.req.param("id"), session.userId)
    .run();

  return noContent();
});

// ── SPA fallback: 정적 파일 서빙 (React 클라이언트 라우팅 포함) ─────────────
// ASSETS 바인딩은 wrangler v4+ 또는 운영 환경에서만 주입됨
app.all("*", async (c) => {
  if (!c.env.ASSETS) return c.notFound();
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status !== 404) return res;
  // 정적 파일이 없으면 index.html 반환 (SPA 라우팅)
  const url = new URL(c.req.url);
  url.pathname = "/";
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

// ── Workers export ─────────────────────────────────────────────────────────
export default app;
