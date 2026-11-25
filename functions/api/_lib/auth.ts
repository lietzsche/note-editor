import type { Context } from "hono";
import type { AccountSummary, Env, SessionContext, SessionData } from "./types";

const SESSION_COOKIE = "session";
const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
const PASSWORD_HASH_ITERATIONS = 100_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BYTES = 32;

async function hmacSignature(secret: string, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

function base64Encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64UrlEncode(bytes: Uint8Array) {
  return base64Encode(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlEncodeText(value: string) {
  return base64UrlEncode(new TextEncoder().encode(value));
}

function decodeBase64Value(value: string): Uint8Array | null {
  try {
    const normalized = value
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - normalized.length % 4) % 4),
      "="
    );
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function decodeBase64Text(value: string) {
  const bytes = decodeBase64Value(value);
  if (!bytes) return null;

  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function verifyHmacSignature(secret: string, data: string, signature: string) {
  const expected = await hmacSignature(secret, data);
  const actual = decodeBase64Value(signature);

  return Boolean(actual && timingSafeEqual(expected, actual));
}

export const MAX_MULTI_SESSIONS = 5;

type MultiSessionCookiePayload = {
  v: 2;
  activeSessionId: string;
  sessions: SessionData[];
};

function buildAccountSummaries(
  sessions: SessionData[],
  activeSessionId: string
): AccountSummary[] {
  return sessions.map((item) => ({
    userId: item.userId,
    username: item.username,
    isActive: item.sessionId === activeSessionId,
  }));
}

async function writeSessionCookie(
  c: Context<{ Bindings: Env }>,
  payload: MultiSessionCookiePayload
): Promise<void> {
  const ttl = parseInt(c.env.AUTH_SESSION_TTL_SECONDS ?? "604800", 10);
  const encodedPayload = base64UrlEncodeText(JSON.stringify(payload));
  const sig = base64UrlEncode(await hmacSignature(c.env.AUTH_SESSION_SECRET, encodedPayload));
  const token = `${encodedPayload}.${sig}`;
  c.header(
    "Set-Cookie",
    buildSessionCookie(token, ttl, isSecureRequest(c))
  );
}

async function resolveValidCookieSessions(
  c: Context<{ Bindings: Env }>
): Promise<{
  rawPayload: MultiSessionCookiePayload | null;
  validSessions: SessionData[];
}> {
  const rawPayload = await parseSessionCookie(c);
  if (!rawPayload || rawPayload.sessions.length === 0) {
    return { rawPayload: null, validSessions: [] };
  }

  const sessionIds = rawPayload.sessions
    .map((item) => item.sessionId)
    .filter(Boolean);
  if (sessionIds.length === 0) {
    return { rawPayload, validSessions: [] };
  }

  const placeholders = sessionIds.map(() => "?").join(", ");
  const { results } = await c.env.DB.prepare(
    `SELECT id, user_id, username FROM sessions WHERE id IN (${placeholders}) AND expires_at > ?`
  )
    .bind(...sessionIds, new Date().toISOString())
    .all<{ id: string; user_id: string; username: string }>();

  const validById = new Map<string, SessionData>();
  for (const row of results) {
    validById.set(row.id, {
      sessionId: row.id,
      userId: row.user_id,
      username: row.username,
    });
  }

  // 쿠키 순서를 유지하되 같은 userId가 중복되면 활성 세션을 우선한다.
  const orderedValid: SessionData[] = [];
  const seenUsers = new Set<string>();
  const activeValid = validById.get(rawPayload.activeSessionId);

  for (const item of rawPayload.sessions) {
    const valid = validById.get(item.sessionId);
    if (!valid) continue;
    if (seenUsers.has(valid.userId)) continue;
    if (activeValid && valid.userId === activeValid.userId && valid.sessionId !== activeValid.sessionId) {
      continue;
    }
    seenUsers.add(valid.userId);
    orderedValid.push(valid);
  }

  if (activeValid && !seenUsers.has(activeValid.userId)) {
    orderedValid.unshift(activeValid);
  }

  return { rawPayload, validSessions: orderedValid };
}

export async function createSession(
  c: Context<{ Bindings: Env }>,
  session: Omit<SessionData, "sessionId">
): Promise<
  | { ok: true; session: SessionData; accounts: AccountSummary[] }
  | { ok: false; reason: "max_sessions" }
> {
  const { validSessions } = await resolveValidCookieSessions(c);
  const replacedSessions = validSessions.filter((item) => item.userId === session.userId);
  const otherSessions = validSessions.filter((item) => item.userId !== session.userId);

  if (otherSessions.length >= MAX_MULTI_SESSIONS) {
    return { ok: false, reason: "max_sessions" };
  }

  const sessionId = crypto.randomUUID();
  const ttl = parseInt(c.env.AUTH_SESSION_TTL_SECONDS ?? "604800", 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();

  const statements = [
    c.env.DB.prepare(
      "INSERT INTO sessions (id, user_id, username, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(sessionId, session.userId, session.username, expiresAt, now.toISOString()),
    ...replacedSessions.map((old) =>
      c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(old.sessionId)
    ),
  ];

  await c.env.DB.batch(statements);

  const newSession: SessionData = { ...session, sessionId };
  const nextSessions = [...otherSessions, newSession];

  await writeSessionCookie(c, {
    v: 2,
    activeSessionId: sessionId,
    sessions: nextSessions,
  });

  return {
    ok: true,
    session: newSession,
    accounts: buildAccountSummaries(nextSessions, sessionId),
  };
}

export async function getSessionContext(
  c: Context<{ Bindings: Env }>
): Promise<SessionContext | null> {
  const { rawPayload, validSessions } = await resolveValidCookieSessions(c);
  if (!rawPayload || validSessions.length === 0) return null;

  const activeSession =
    validSessions.find((item) => item.sessionId === rawPayload.activeSessionId) ??
    validSessions[0];

  return {
    activeSession,
    sessions: validSessions,
    accounts: buildAccountSummaries(validSessions, activeSession.sessionId),
  };
}

export async function getSession(
  c: Context<{ Bindings: Env }>
): Promise<SessionData | null> {
  const ctx = await getSessionContext(c);
  return ctx?.activeSession ?? null;
}

export async function switchSession(
  c: Context<{ Bindings: Env }>,
  targetUserId: string
): Promise<SessionContext | null> {
  const { validSessions } = await resolveValidCookieSessions(c);
  const target = validSessions.find((item) => item.userId === targetUserId);
  if (!target) return null;

  await writeSessionCookie(c, {
    v: 2,
    activeSessionId: target.sessionId,
    sessions: validSessions,
  });

  return {
    activeSession: target,
    sessions: validSessions,
    accounts: buildAccountSummaries(validSessions, target.sessionId),
  };
}

async function parseSessionCookie(
  c: Context<{ Bindings: Env }>
): Promise<MultiSessionCookiePayload | null> {
  const cookie = c.req.header("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;

  const [payload, sig] = match[1].split(".");
  if (!payload || !sig) return null;

  const verified = await verifyHmacSignature(c.env.AUTH_SESSION_SECRET, payload, sig);
  if (!verified) return null;

  try {
    const decoded = decodeBase64Text(payload);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded) as Partial<MultiSessionCookiePayload> & Partial<SessionData>;

    if (
      parsed.v === 2 &&
      typeof parsed.activeSessionId === "string" &&
      Array.isArray(parsed.sessions)
    ) {
      const normalizedSessions = parsed.sessions.filter(
        (item): item is SessionData =>
          Boolean(
            item &&
            typeof item.sessionId === "string" &&
            typeof item.userId === "string" &&
            typeof item.username === "string"
          )
      );
      return {
        v: 2,
        activeSessionId: parsed.activeSessionId,
        sessions: normalizedSessions,
      };
    }

    // 기존 v1 단일 세션 쿠키 하위 호환
    if (
      typeof parsed.sessionId === "string" &&
      typeof parsed.userId === "string" &&
      typeof parsed.username === "string"
    ) {
      const single: SessionData = {
        sessionId: parsed.sessionId,
        userId: parsed.userId,
        username: parsed.username,
      };
      return {
        v: 2,
        activeSessionId: single.sessionId,
        sessions: [single],
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function clearSession(
  c: Context<{ Bindings: Env }>,
  options?: { scope?: "current" | "all"; sessionId?: string }
): Promise<{
  loggedOutSessions: SessionData[];
  nextContext: SessionContext | null;
}> {
  const scope = options?.scope ?? "current";
  const { rawPayload, validSessions } = await resolveValidCookieSessions(c);

  if (scope === "all") {
    const allIds = Array.from(
      new Set([
        ...(rawPayload?.sessions.map((item) => item.sessionId) ?? []),
        ...validSessions.map((item) => item.sessionId),
      ])
    );
    if (allIds.length > 0) {
      const placeholders = allIds.map(() => "?").join(", ");
      await c.env.DB.prepare(`DELETE FROM sessions WHERE id IN (${placeholders})`)
        .bind(...allIds)
        .run();
    }

    c.header(
      "Set-Cookie",
      buildSessionCookie("", 0, isSecureRequest(c))
    );

    return {
      loggedOutSessions: validSessions,
      nextContext: null,
    };
  }

  const activeSession =
    validSessions.find((item) => item.sessionId === (options?.sessionId ?? rawPayload?.activeSessionId)) ??
    validSessions[0] ??
    null;

  if (activeSession) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(activeSession.sessionId)
      .run();
  }

  const remaining = activeSession
    ? validSessions.filter((item) => item.sessionId !== activeSession.sessionId)
    : [];

  if (remaining.length > 0) {
    const nextActive = remaining[0];
    await writeSessionCookie(c, {
      v: 2,
      activeSessionId: nextActive.sessionId,
      sessions: remaining,
    });

    return {
      loggedOutSessions: activeSession ? [activeSession] : [],
      nextContext: {
        activeSession: nextActive,
        sessions: remaining,
        accounts: buildAccountSummaries(remaining, nextActive.sessionId),
      },
    };
  }

  c.header(
    "Set-Cookie",
    buildSessionCookie("", 0, isSecureRequest(c))
  );

  return {
    loggedOutSessions: activeSession ? [activeSession] : [],
    nextContext: null,
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await derivePasswordHash(password, salt, PASSWORD_HASH_ITERATIONS);

  return [
    PASSWORD_HASH_PREFIX,
    PASSWORD_HASH_ITERATIONS,
    base64UrlEncode(salt),
    base64UrlEncode(hash),
  ].join(":");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parsed = parsePasswordHash(storedHash);

  if (!parsed) {
    const legacyHash = await legacySha256PasswordHash(password);
    return timingSafeEqual(
      new TextEncoder().encode(legacyHash),
      new TextEncoder().encode(storedHash)
    );
  }

  const expected = await derivePasswordHash(password, parsed.salt, parsed.iterations);
  return timingSafeEqual(expected, parsed.hash);
}

export function shouldRehashPassword(storedHash: string) {
  const parsed = parsePasswordHash(storedHash);
  return !parsed || parsed.iterations < PASSWORD_HASH_ITERATIONS;
}

async function legacySha256PasswordHash(password: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(password));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number
) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    key,
    PASSWORD_HASH_BYTES * 8
  );

  return new Uint8Array(bits);
}

function parsePasswordHash(storedHash: string) {
  const parts = storedHash.split(":");
  if (parts.length !== 4) return null;

  const [scheme, iterationsValue, saltValue, hashValue] = parts;
  if (scheme !== PASSWORD_HASH_PREFIX || !iterationsValue || !saltValue || !hashValue) {
    return null;
  }

  const iterations = Number(iterationsValue);
  const salt = decodeBase64Value(saltValue);
  const hash = decodeBase64Value(hashValue);

  if (
    !Number.isInteger(iterations) ||
    iterations <= 0 ||
    !salt ||
    !hash ||
    hash.length !== PASSWORD_HASH_BYTES
  ) {
    return null;
  }

  return { iterations, salt, hash };
}

function isSecureRequest(c: Context<{ Bindings: Env }>): boolean {
  return new URL(c.req.url).protocol === "https:";
}

function buildSessionCookie(token: string, maxAge: number, secure: boolean): string {
  const attrs = [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];

  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}
