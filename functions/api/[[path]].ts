import { Context, Hono } from "hono";
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
import {
  generateShareToken,
  validateShareToken,
  incrementAccessCount,
  getShareTokenForNote,
  upsertShareToken,
  deactivateShareToken,
} from "./_lib/share";

const app = new Hono<{ Bindings: Env }>();

const DEFAULT_GROUP_NAME = "미분류";
const GROUP_NAME_MAX_LENGTH = 40;
const GROUP_MAX_COUNT = 30;
const NOTE_TITLE_MAX_LENGTH = 120;
const NOTE_CONTENT_MAX_LENGTH = 20_000;

function validateGroupName(name: string) {
  const normalizedName = name.trim();

  if (normalizedName.length < 1 || normalizedName.length > GROUP_NAME_MAX_LENGTH) {
    return err("VALIDATION", `그룹명은 1~${GROUP_NAME_MAX_LENGTH}자여야 합니다.`);
  }

  return normalizedName;
}

async function findOwnedGroup(
  db: D1Database,
  userId: string,
  groupId: string
) {
  return db.prepare(
    "SELECT id, name, position FROM groups WHERE id = ? AND user_id = ?"
  )
    .bind(groupId, userId)
    .first<{ id: string; name: string; position: number }>();
}

async function getDefaultGroupId(db: D1Database, userId: string) {
  const defaultGroup = await db.prepare(
    "SELECT id FROM groups WHERE user_id = ? AND name = ?"
  )
    .bind(userId, DEFAULT_GROUP_NAME)
    .first<{ id: string }>();

  return defaultGroup?.id ?? null;
}

async function hasDuplicateGroupName(
  db: D1Database,
  userId: string,
  groupName: string,
  excludeGroupId?: string
) {
  const query = excludeGroupId
    ? db.prepare(
      "SELECT id FROM groups WHERE user_id = ? AND name = ? AND id != ?"
    ).bind(userId, groupName, excludeGroupId)
    : db.prepare(
      "SELECT id FROM groups WHERE user_id = ? AND name = ?"
    ).bind(userId, groupName);

  const existingGroup = await query.first<{ id: string }>();
  return Boolean(existingGroup);
}

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
    .bind(groupId, id, DEFAULT_GROUP_NAME, now, now)
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
  if (typeof name !== "string") return err("VALIDATION", "name은 문자열이어야 합니다.");

  const normalizedName = validateGroupName(name);
  if (normalizedName instanceof Response) return normalizedName;

  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM groups WHERE user_id = ?"
  )
    .bind(session.userId)
    .first<{ cnt: number }>();
  if ((count?.cnt ?? 0) >= GROUP_MAX_COUNT)
    return err("LIMIT", `그룹은 최대 ${GROUP_MAX_COUNT}개까지 생성할 수 있습니다.`, 422);

  const duplicated = await hasDuplicateGroupName(c.env.DB, session.userId, normalizedName);
  if (duplicated) return err("CONFLICT", "이미 존재하는 그룹명입니다.", 409);

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
    .bind(id, session.userId, normalizedName, position, now, now)
    .run();

  return created({ id, name: normalizedName, position });
});

app.post("/api/groups/reorder", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const body = await c.req.json<{ orderedGroupIds?: unknown }>();
  const orderedGroupIds = body.orderedGroupIds;

  if (
    !Array.isArray(orderedGroupIds) ||
    orderedGroupIds.some((groupId) => typeof groupId !== "string" || groupId.length === 0)
  ) {
    return err("VALIDATION", "orderedGroupIds는 그룹 ID 문자열 배열이어야 합니다.");
  }

  if (new Set(orderedGroupIds).size !== orderedGroupIds.length) {
    return err("VALIDATION", "orderedGroupIds에 중복된 그룹 ID가 포함되어 있습니다.");
  }

  const { results } = await c.env.DB.prepare(
    "SELECT id FROM groups WHERE user_id = ? ORDER BY position ASC"
  )
    .bind(session.userId)
    .all<{ id: string }>();

  const existingGroupIds = results.map((group) => group.id);
  if (existingGroupIds.length !== orderedGroupIds.length) {
    return err("VALIDATION", "orderedGroupIds는 현재 사용자의 전체 그룹 순서를 모두 포함해야 합니다.");
  }

  const existingGroupIdsSet = new Set(existingGroupIds);
  if (orderedGroupIds.some((groupId) => !existingGroupIdsSet.has(groupId))) {
    return err("VALIDATION", "orderedGroupIds에 유효하지 않은 그룹 ID가 포함되어 있습니다.");
  }

  const now = new Date().toISOString();
  await c.env.DB.batch(
    orderedGroupIds.map((groupId, index) => (
      c.env.DB.prepare(
        "UPDATE groups SET position = ?, updated_at = ? WHERE id = ? AND user_id = ?"
      ).bind(index, now, groupId, session.userId)
    ))
  );

  return ok({ orderedGroupIds });
});

app.put("/api/groups/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const groupId = c.req.param("id");
  if (!groupId) return notFound();

  const group = await findOwnedGroup(c.env.DB, session.userId, groupId);
  if (!group) return notFound();
  if (group.name === DEFAULT_GROUP_NAME) {
    return err("FORBIDDEN", "기본 그룹(미분류)은 이름을 변경할 수 없습니다.", 403);
  }

  const { name } = await c.req.json<{ name: string }>();
  if (typeof name !== "string") return err("VALIDATION", "name은 문자열이어야 합니다.");

  const normalizedName = validateGroupName(name);
  if (normalizedName instanceof Response) return normalizedName;

  const duplicated = await hasDuplicateGroupName(
    c.env.DB,
    session.userId,
    normalizedName,
    groupId
  );
  if (duplicated) return err("CONFLICT", "이미 존재하는 그룹명입니다.", 409);

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    "UPDATE groups SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?"
  )
    .bind(normalizedName, now, groupId, session.userId)
    .run();

  return ok({ id: groupId, name: normalizedName, position: group.position });
});

app.delete("/api/groups/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const groupId = c.req.param("id");
  if (!groupId) return notFound();

  const group = await findOwnedGroup(c.env.DB, session.userId, groupId);

  if (!group) return notFound();
  if (group.name === DEFAULT_GROUP_NAME)
    return err("FORBIDDEN", "기본 그룹(미분류)은 삭제할 수 없습니다.", 403);

  const defaultGroupId = await getDefaultGroupId(c.env.DB, session.userId);

  if (defaultGroupId) {
    await c.env.DB.prepare(
      "UPDATE pages SET group_id = ? WHERE group_id = ? AND user_id = ?"
    )
      .bind(defaultGroupId, groupId, session.userId)
      .run();
  }

  await c.env.DB.prepare("DELETE FROM groups WHERE id = ? AND user_id = ?")
    .bind(groupId, session.userId)
    .run();

  return noContent();
});

// ── Notes routes ───────────────────────────────────────────────────────────

function validateNoteTitle(title: string) {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length < 1 || normalizedTitle.length > NOTE_TITLE_MAX_LENGTH) {
    return err("VALIDATION", `제목은 1~${NOTE_TITLE_MAX_LENGTH}자여야 합니다.`);
  }

  return normalizedTitle;
}

function validateNoteContent(content: string) {
  if (content.length > NOTE_CONTENT_MAX_LENGTH) {
    return err("VALIDATION", `본문은 ${NOTE_CONTENT_MAX_LENGTH}자 이하여야 합니다.`);
  }

  return content;
}

async function resolveOwnedGroupId(
  db: D1Database,
  userId: string,
  groupId: string | null
) {
  if (groupId === null) return null;

  const group = await findOwnedGroup(db, userId, groupId);

  return group?.id ?? false;
}

async function resolveNoteGroupId(
  db: D1Database,
  userId: string,
  groupId: string | null
) {
  if (groupId === null) {
    const defaultGroupId = await getDefaultGroupId(db, userId);
    return defaultGroupId ?? false;
  }

  return resolveOwnedGroupId(db, userId, groupId);
}

app.get("/api/notes", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const groupId = c.req.query("group_id");
  let query: D1PreparedStatement;

  if (groupId) {
    const ownedGroupId = await resolveOwnedGroupId(c.env.DB, session.userId, groupId);
    if (ownedGroupId === false) return forbidden();

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

  const body = await c.req.json<{
    title?: string;
    content?: string;
    group_id?: string;
  }>();

  if (typeof body.title !== "string") {
    return err("VALIDATION", "title은 문자열이어야 합니다.");
  }
  if (body.content !== undefined && typeof body.content !== "string") {
    return err("VALIDATION", "content는 문자열이어야 합니다.");
  }
  if (body.group_id !== undefined && typeof body.group_id !== "string") {
    return err("VALIDATION", "group_id는 문자열이어야 합니다.");
  }

  const title = validateNoteTitle(body.title);
  if (title instanceof Response) return title;

  const content = validateNoteContent(body.content ?? "");
  if (content instanceof Response) return content;

  const resolvedGroupId = await resolveNoteGroupId(
    c.env.DB,
    session.userId,
    body.group_id ?? null
  );
  if (resolvedGroupId === false) return forbidden();

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

  return created({
    id,
    title,
    content,
    group_id: resolvedGroupId,
    sort_order,
    updated_at: now,
  });
});

app.post("/api/notes/reorder", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const body = await c.req.json<{ orderedNoteIds?: unknown; scope?: unknown }>();
  const orderedNoteIds = body.orderedNoteIds;
  const scope = body.scope;

  if (
    !Array.isArray(orderedNoteIds) ||
    orderedNoteIds.some((noteId) => typeof noteId !== "string" || noteId.length === 0)
  ) {
    return err("VALIDATION", "orderedNoteIds는 노트 ID 문자열 배열이어야 합니다.");
  }

  if (new Set(orderedNoteIds).size !== orderedNoteIds.length) {
    return err("VALIDATION", "orderedNoteIds에 중복된 노트 ID가 포함되어 있습니다.");
  }

  const { results } = await c.env.DB.prepare(
    "SELECT id, group_id FROM pages WHERE user_id = ? ORDER BY sort_order ASC"
  )
    .bind(session.userId)
    .all<{ id: string; group_id: string | null }>();

  let nextOrderedNoteIds: string[];

  if (scope === undefined) {
    const existingNoteIds = results.map((note) => note.id);

    if (existingNoteIds.length !== orderedNoteIds.length) {
      return err("VALIDATION", "orderedNoteIds는 현재 사용자의 전체 노트 순서를 포함해야 합니다.");
    }

    const existingNoteIdsSet = new Set(existingNoteIds);
    if (orderedNoteIds.some((noteId) => !existingNoteIdsSet.has(noteId))) {
      return err("VALIDATION", "orderedNoteIds에 유효하지 않은 노트 ID가 포함되어 있습니다.");
    }

    nextOrderedNoteIds = orderedNoteIds;
  } else {
    if (
      typeof scope !== "object" ||
      scope === null ||
      !("type" in scope) ||
      !("group_id" in scope) ||
      scope.type !== "group" ||
      typeof scope.group_id !== "string" ||
      scope.group_id.length === 0
    ) {
      return err("VALIDATION", "scope는 { type: \"group\", group_id: string } 형태여야 합니다.");
    }

    const ownedGroupId = await resolveOwnedGroupId(c.env.DB, session.userId, scope.group_id);
    if (ownedGroupId === false) return forbidden();

    const existingGroupNoteIds = results
      .filter((note) => note.group_id === ownedGroupId)
      .map((note) => note.id);

    if (existingGroupNoteIds.length !== orderedNoteIds.length) {
      return err("VALIDATION", "orderedNoteIds는 선택한 그룹의 현재 노트 순서를 모두 포함해야 합니다.");
    }

    const existingGroupNoteIdsSet = new Set(existingGroupNoteIds);
    if (orderedNoteIds.some((noteId) => !existingGroupNoteIdsSet.has(noteId))) {
      return err("VALIDATION", "orderedNoteIds에 선택한 그룹 바깥 노트가 포함되어 있습니다.");
    }

    let groupNoteIndex = 0;
    nextOrderedNoteIds = results.map((note) => (
      note.group_id === ownedGroupId ? orderedNoteIds[groupNoteIndex++] : note.id
    ));
  }

  if (nextOrderedNoteIds.length > 0) {
    await c.env.DB.batch(
      nextOrderedNoteIds.map((noteId, index) =>
        c.env.DB.prepare(
          "UPDATE pages SET sort_order = ? WHERE id = ? AND user_id = ?"
        ).bind(index, noteId, session.userId)
      )
    );
  }

  return ok(scope === undefined ? { orderedNoteIds } : { orderedNoteIds, scope });
});

app.get("/api/notes/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();
  const noteId = c.req.param("id");
  if (!noteId) return notFound();

  const note = await c.env.DB.prepare(
    "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first();

  if (!note) return notFound();
  return ok(note);
});

const updateNoteHandler = async (c: Context<{ Bindings: Env }>) => {
  const session = await getSession(c);
  if (!session) return unauthorized();
  const noteId = c.req.param("id");
  if (!noteId) return notFound();

  const note = await c.env.DB.prepare(
    "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first<{
      id: string;
      title: string;
      content: string;
      group_id: string | null;
      sort_order: number;
      updated_at: string;
    }>();
  if (!note) return notFound();

  const body = await c.req.json<{
    title?: string;
    content?: string;
    group_id?: string | null;
    updated_at?: string;
    force?: boolean;
  }>();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.title !== undefined && typeof body.title !== "string") {
    return err("VALIDATION", "title은 문자열이어야 합니다.");
  }
  if (body.content !== undefined && typeof body.content !== "string") {
    return err("VALIDATION", "content는 문자열이어야 합니다.");
  }
  if (body.group_id !== undefined && body.group_id !== null && typeof body.group_id !== "string") {
    return err("VALIDATION", "group_id는 문자열이어야 합니다.");
  }
  if (body.updated_at !== undefined && typeof body.updated_at !== "string") {
    return err("VALIDATION", "updated_at은 문자열이어야 합니다.");
  }
  if (body.force !== undefined && typeof body.force !== "boolean") {
    return err("VALIDATION", "force는 불리언이어야 합니다.");
  }

  if (body.updated_at !== undefined && body.updated_at !== note.updated_at && body.force !== true) {
    return Response.json({
      error: {
        code: "CONFLICT",
        message: "다른 세션에서 먼저 저장되어 충돌이 발생했습니다.",
      },
      data: note,
    }, { status: 409 });
  }

  if (body.title !== undefined) {
    const title = validateNoteTitle(body.title);
    if (title instanceof Response) return title;
    fields.push("title = ?");
    values.push(title);
  }
  if (body.content !== undefined) {
    const content = validateNoteContent(body.content);
    if (content instanceof Response) return content;
    fields.push("content = ?");
    values.push(content);
  }
  if (body.group_id !== undefined) {
    const resolvedGroupId = await resolveNoteGroupId(c.env.DB, session.userId, body.group_id);
    if (resolvedGroupId === false) return forbidden();
    values.push(resolvedGroupId);
    fields.push("group_id = ?");
  }

  if (fields.length === 0) return err("VALIDATION", "수정할 필드가 없습니다.");

  const now = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(now);
  values.push(noteId);
  values.push(session.userId);

  await c.env.DB.prepare(
    `UPDATE pages SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`
  )
    .bind(...values)
    .run();

  const updated = await c.env.DB.prepare(
    "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first();

  return ok(updated);
};

app.patch("/api/notes/:id", updateNoteHandler);
app.put("/api/notes/:id", updateNoteHandler);

app.patch("/api/notes/:id/group", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();

  const noteId = c.req.param("id");
  if (!noteId) return notFound();

  const note = await c.env.DB.prepare(
    "SELECT id FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first<{ id: string }>();
  if (!note) return notFound();

  const { group_id } = await c.req.json<{ group_id?: string | null }>();
  if (group_id === undefined) return err("VALIDATION", "group_id를 입력하세요.");
  if (group_id !== null && typeof group_id !== "string") {
    return err("VALIDATION", "group_id는 문자열이어야 합니다.");
  }

  const resolvedGroupId = await resolveNoteGroupId(c.env.DB, session.userId, group_id);
  if (resolvedGroupId === false) return forbidden();

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    "UPDATE pages SET group_id = ?, updated_at = ? WHERE id = ? AND user_id = ?"
  )
    .bind(resolvedGroupId, now, noteId, session.userId)
    .run();

  const updated = await c.env.DB.prepare(
    "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first();

  return ok(updated);
});

app.delete("/api/notes/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();
  const noteId = c.req.param("id");
  if (!noteId) return notFound();

  const note = await c.env.DB.prepare(
    "SELECT id FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first();
  if (!note) return notFound();

  await c.env.DB.prepare("DELETE FROM pages WHERE id = ? AND user_id = ?")
    .bind(noteId, session.userId)
    .run();

  return noContent();
});

// ── Note sharing routes ──────────────────────────────────────────────────

// 공유 활성화/갱신
app.post("/api/notes/:id/share", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();
  const noteId = c.req.param("id");
  if (!noteId) return notFound();

  // 노트 소유권 확인
  const note = await c.env.DB.prepare(
    "SELECT id FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first();
  if (!note) return notFound();

  const body = await c.req.json<{ expires_at?: string }>();
  const expiresAt = body.expires_at && typeof body.expires_at === "string" ? body.expires_at : null;

  const shareToken = await upsertShareToken(c.env.DB, noteId, expiresAt);
  const shareInfo = await getShareTokenForNote(c.env.DB, noteId);
  if (!shareInfo) return err("INTERNAL", "공유 정보를 생성하지 못했습니다.");

  return ok({
    share_token: shareInfo.shareToken,
    is_active: shareInfo.isActive,
    expires_at: shareInfo.expiresAt,
    access_count: shareInfo.accessCount,
    share_url: `/shared/${shareInfo.shareToken}`,
  });
});

// 공유 비활성화
app.delete("/api/notes/:id/share", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();
  const noteId = c.req.param("id");
  if (!noteId) return notFound();

  const note = await c.env.DB.prepare(
    "SELECT id FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first();
  if (!note) return notFound();

  await deactivateShareToken(c.env.DB, noteId);
  return noContent();
});

// 공유 상태 조회
app.get("/api/notes/:id/share", async (c) => {
  const session = await getSession(c);
  if (!session) return unauthorized();
  const noteId = c.req.param("id");
  if (!noteId) return notFound();

  const note = await c.env.DB.prepare(
    "SELECT id FROM pages WHERE id = ? AND user_id = ?"
  )
    .bind(noteId, session.userId)
    .first();
  if (!note) return notFound();

  const shareInfo = await getShareTokenForNote(c.env.DB, noteId);
  if (!shareInfo) {
    return ok({
      is_active: false,
      share_token: null,
      expires_at: null,
      access_count: 0,
      share_url: null,
    });
  }

  return ok({
    share_token: shareInfo.shareToken,
    is_active: shareInfo.isActive,
    expires_at: shareInfo.expiresAt,
    access_count: shareInfo.accessCount,
    share_url: `/shared/${shareInfo.shareToken}`,
  });
});

// 공유된 노트 읽기 (인증 불필요)
app.get("/api/shared/:shareToken", async (c) => {
  const shareToken = c.req.param("shareToken");
  if (!shareToken) return notFound();

  const validation = await validateShareToken(c.env.DB, shareToken);
  if (!validation) return notFound();

  const note = await c.env.DB.prepare(
    "SELECT id, title, content, group_id, sort_order, updated_at FROM pages WHERE id = ?"
  )
    .bind(validation.noteId)
    .first();
  if (!note) return notFound();

  // 접근 횟수 증가 (비동기, 실패해도 무시)
  incrementAccessCount(c.env.DB, shareToken).catch(() => {});

  return ok({
    ...note,
    shared: true,
  });
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
