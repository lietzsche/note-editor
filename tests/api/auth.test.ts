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

async function listNotesByGroup(cookie: string, groupId: string, base = BASE) {
  return SELF.fetch(`${base}/api/notes?group_id=${encodeURIComponent(groupId)}`, {
    headers: { Cookie: cookie },
  });
}

async function getNote(cookie: string, noteId: string, base = BASE) {
  return SELF.fetch(`${base}/api/notes/${noteId}`, {
    headers: { Cookie: cookie },
  });
}

async function updateNote(
  cookie: string,
  noteId: string,
  body: Record<string, unknown>,
  base = BASE
) {
  return SELF.fetch(`${base}/api/notes/${noteId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
}

async function deleteNote(cookie: string, noteId: string, base = BASE) {
  return SELF.fetch(`${base}/api/notes/${noteId}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
}

async function reorderNotes(cookie: string, orderedNoteIds: unknown, base = BASE) {
  return SELF.fetch(`${base}/api/notes/reorder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ orderedNoteIds }),
  });
}

async function listGroups(cookie: string, base = BASE) {
  return SELF.fetch(`${base}/api/groups`, {
    headers: { Cookie: cookie },
  });
}

async function createGroup(cookie: string, name: string, base = BASE) {
  return SELF.fetch(`${base}/api/groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ name }),
  });
}

async function updateGroup(cookie: string, groupId: string, name: string, base = BASE) {
  return SELF.fetch(`${base}/api/groups/${groupId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ name }),
  });
}

async function deleteGroup(cookie: string, groupId: string, base = BASE) {
  return SELF.fetch(`${base}/api/groups/${groupId}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
}

async function moveNoteToGroup(
  cookie: string,
  noteId: string,
  groupId: string | null,
  base = BASE
) {
  return SELF.fetch(`${base}/api/notes/${noteId}/group`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ group_id: groupId }),
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

describe("Notes API validation", () => {
  beforeEach(async () => {
    await signup("alice", "password123");
  });

  it("노트가 없으면 빈 배열을 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const listRes = await listNotes(cookie);
    expect(listRes.status).toBe(200);

    const body = await listRes.json() as any;
    expect(body.data).toEqual([]);
  });

  it("제목이 비어 있으면 생성 시 400을 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "",
      content: "본문",
    });
    expect(createRes.status).toBe(400);
  });

  it("제목이 120자를 초과하면 생성 시 400을 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "a".repeat(121),
      content: "본문",
    });
    expect(createRes.status).toBe(400);
  });

  it("본문이 20000자를 초과하면 생성 시 400을 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "긴 본문 테스트",
      content: "a".repeat(20001),
    });
    expect(createRes.status).toBe(400);
  });

  it("존재하지 않는 노트 조회는 404를 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const getRes = await getNote(cookie, "missing-note-id");
    expect(getRes.status).toBe(404);
  });

  it("잘못된 정렬 payload는 400을 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const noteRes = await createNote(cookie, {
      title: "첫 노트",
      content: "본문",
    });
    const noteBody = await noteRes.json() as any;

    const reorderRes = await reorderNotes(cookie, [
      noteBody.data.id,
      noteBody.data.id,
    ]);
    expect(reorderRes.status).toBe(400);
  });
});

describe("Groups API validation", () => {
  beforeEach(async () => {
    await signup("alice", "password123");
  });

  it("회원가입 직후 기본 그룹(미분류)이 존재한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const groupsRes = await listGroups(cookie);
    expect(groupsRes.status).toBe(200);

    const body = await groupsRes.json() as any;
    expect(body.data.some((group: any) => group.name === "미분류")).toBe(true);
  });

  it("같은 사용자 내 중복 그룹명 생성은 409를 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const firstRes = await createGroup(cookie, "Work");
    expect(firstRes.status).toBe(201);

    const duplicateRes = await createGroup(cookie, "Work");
    expect(duplicateRes.status).toBe(409);
  });

  it("기본 그룹 삭제는 403을 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const groupsRes = await listGroups(cookie);
    const groupsBody = await groupsRes.json() as any;
    const defaultGroup = groupsBody.data.find((group: any) => group.name === "미분류");

    const deleteRes = await deleteGroup(cookie, defaultGroup.id);
    expect(deleteRes.status).toBe(403);
  });

  it("잘못된 group_id로 노트 이동 시 403을 반환한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createRes = await createNote(cookie, {
      title: "이동 테스트",
      content: "본문",
    });
    const createdBody = await createRes.json() as any;

    const moveRes = await moveNoteToGroup(cookie, createdBody.data.id, "missing-group-id");
    expect(moveRes.status).toBe(403);
  });

  it("다른 사용자 그룹으로 노트를 이동할 수 없다", async () => {
    await signup("bob", "password123");

    const aliceLoginRes = await login("alice", "password123");
    const aliceCookie = extractCookie(aliceLoginRes);
    const bobLoginRes = await login("bob", "password123");
    const bobCookie = extractCookie(bobLoginRes);

    const bobGroupRes = await createGroup(bobCookie, "Bob Group");
    expect(bobGroupRes.status).toBe(201);
    const bobGroupBody = await bobGroupRes.json() as any;

    const aliceNoteRes = await createNote(aliceCookie, {
      title: "Alice Note",
      content: "본문",
    });
    const aliceNoteBody = await aliceNoteRes.json() as any;

    const moveRes = await moveNoteToGroup(aliceCookie, aliceNoteBody.data.id, bobGroupBody.data.id);
    expect(moveRes.status).toBe(403);
  });
});

describe("TS-02 노트 CRUD", () => {
  beforeEach(async () => {
    await signup("alice", "password123");
  });

  it("노트 3건 생성, 1건 수정, 1건 삭제 후 재조회 결과가 일치한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const createdNotes: Array<{ id: string; title: string }> = [];

    for (const title of ["첫 노트", "둘째 노트", "셋째 노트"]) {
      const createRes = await createNote(cookie, { title, content: `${title} 본문` });
      expect(createRes.status).toBe(201);
      const body = await createRes.json() as any;
      createdNotes.push({ id: body.data.id, title: body.data.title });
    }

    const updateRes = await updateNote(cookie, createdNotes[1].id, {
      title: "수정된 둘째 노트",
      content: "업데이트된 본문",
    });
    expect(updateRes.status).toBe(200);

    const deleteRes = await deleteNote(cookie, createdNotes[0].id);
    expect(deleteRes.status).toBe(204);

    const listRes = await listNotes(cookie);
    expect(listRes.status).toBe(200);

    const listBody = await listRes.json() as any;
    expect(listBody.data).toHaveLength(2);
    expect(listBody.data.map((note: any) => note.id)).not.toContain(createdNotes[0].id);

    const updatedNote = listBody.data.find((note: any) => note.id === createdNotes[1].id);
    expect(updatedNote.title).toBe("수정된 둘째 노트");
    expect(updatedNote.content).toBe("업데이트된 본문");
  });
});

describe("TS-03 노트 정렬", () => {
  beforeEach(async () => {
    await signup("alice", "password123");
  });

  it("노트 순서를 변경한 뒤 재조회와 재로그인 후에도 유지된다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const ids: string[] = [];

    for (const title of ["첫 노트", "둘째 노트", "셋째 노트"]) {
      const createRes = await createNote(cookie, { title, content: `${title} 본문` });
      expect(createRes.status).toBe(201);
      const body = await createRes.json() as any;
      ids.push(body.data.id);
    }

    const reordered = [ids[2], ids[0], ids[1]];
    const reorderRes = await reorderNotes(cookie, reordered);
    expect(reorderRes.status).toBe(200);

    const listRes = await listNotes(cookie);
    const listBody = await listRes.json() as any;
    expect(listBody.data.map((note: any) => note.id)).toEqual(reordered);

    await logout(cookie);

    const reloginRes = await login("alice", "password123");
    const newCookie = extractCookie(reloginRes);
    const relistRes = await listNotes(newCookie);
    const relistBody = await relistRes.json() as any;
    expect(relistBody.data.map((note: any) => note.id)).toEqual(reordered);
  });
});

describe("TS-04 계정 격리", () => {
  beforeEach(async () => {
    await signup("user_a", "password123");
    await signup("user_b", "password123");
  });

  it("다른 사용자는 타인 노트를 조회/수정/삭제할 수 없다", async () => {
    const loginARes = await login("user_a", "password123");
    const cookieA = extractCookie(loginARes);

    const createRes = await createNote(cookieA, {
      title: "user_a 노트",
      content: "격리 테스트",
    });
    expect(createRes.status).toBe(201);
    const createdBody = await createRes.json() as any;
    const noteId = createdBody.data.id;

    const loginBRes = await login("user_b", "password123");
    const cookieB = extractCookie(loginBRes);

    const getRes = await getNote(cookieB, noteId);
    expect(getRes.status).toBe(404);

    const updateRes = await updateNote(cookieB, noteId, {
      title: "침범 시도",
    });
    expect(updateRes.status).toBe(404);

    const deleteRes = await deleteNote(cookieB, noteId);
    expect(deleteRes.status).toBe(404);
  });
});

describe("TS-07 그룹 관리", () => {
  beforeEach(async () => {
    await signup("alice", "password123");
  });

  it("그룹 생성, 필터 조회, 이름 변경, 노트 이동, 삭제 정책이 의도대로 동작한다", async () => {
    const loginRes = await login("alice", "password123");
    const cookie = extractCookie(loginRes);

    const initialGroupsRes = await listGroups(cookie);
    expect(initialGroupsRes.status).toBe(200);
    const initialGroupsBody = await initialGroupsRes.json() as any;
    const defaultGroup = initialGroupsBody.data.find((group: any) => group.name === "미분류");
    expect(defaultGroup).toBeDefined();

    const workRes = await createGroup(cookie, "Work");
    const personalRes = await createGroup(cookie, "Personal");
    expect(workRes.status).toBe(201);
    expect(personalRes.status).toBe(201);

    const workBody = await workRes.json() as any;
    const personalBody = await personalRes.json() as any;
    const workId = workBody.data.id;
    const personalId = personalBody.data.id;

    const renameRes = await updateGroup(cookie, personalId, "Private");
    expect(renameRes.status).toBe(200);

    const noteInWorkRes = await createNote(cookie, {
      title: "업무 노트",
      content: "업무 본문",
      group_id: workId,
    });
    const noteInDefaultRes = await createNote(cookie, {
      title: "기본 노트",
      content: "기본 본문",
    });
    expect(noteInWorkRes.status).toBe(201);
    expect(noteInDefaultRes.status).toBe(201);

    const noteInWorkBody = await noteInWorkRes.json() as any;
    const noteInDefaultBody = await noteInDefaultRes.json() as any;
    expect(noteInDefaultBody.data.group_id).toBe(defaultGroup.id);

    const workListRes = await listNotesByGroup(cookie, workId);
    expect(workListRes.status).toBe(200);
    const workListBody = await workListRes.json() as any;
    expect(workListBody.data).toHaveLength(1);
    expect(workListBody.data[0].id).toBe(noteInWorkBody.data.id);

    const movedRes = await moveNoteToGroup(cookie, noteInWorkBody.data.id, personalId);
    expect(movedRes.status).toBe(200);
    const movedBody = await movedRes.json() as any;
    expect(movedBody.data.group_id).toBe(personalId);

    const renamedGroupListRes = await listGroups(cookie);
    const renamedGroupListBody = await renamedGroupListRes.json() as any;
    expect(
      renamedGroupListBody.data.some((group: any) => group.id === personalId && group.name === "Private")
    ).toBe(true);

    const emptyWorkListRes = await listNotesByGroup(cookie, workId);
    const emptyWorkListBody = await emptyWorkListRes.json() as any;
    expect(emptyWorkListBody.data).toHaveLength(0);

    const privateListRes = await listNotesByGroup(cookie, personalId);
    const privateListBody = await privateListRes.json() as any;
    expect(privateListBody.data).toHaveLength(1);
    expect(privateListBody.data[0].id).toBe(noteInWorkBody.data.id);

    const deleteWorkRes = await deleteGroup(cookie, workId);
    expect(deleteWorkRes.status).toBe(204);

    const deletePrivateRes = await deleteGroup(cookie, personalId);
    expect(deletePrivateRes.status).toBe(204);

    const movedBackNoteRes = await getNote(cookie, noteInWorkBody.data.id);
    expect(movedBackNoteRes.status).toBe(200);
    const movedBackNoteBody = await movedBackNoteRes.json() as any;
    expect(movedBackNoteBody.data.group_id).toBe(defaultGroup.id);
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
