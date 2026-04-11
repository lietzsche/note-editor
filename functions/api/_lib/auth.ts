import type { Context } from "hono";
import type { Env, SessionData } from "./types";

const SESSION_COOKIE = "session";

async function hmacSign(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function createSession(
  c: Context<{ Bindings: Env }>,
  session: Omit<SessionData, "sessionId">
): Promise<void> {
  const sessionId = crypto.randomUUID();
  const ttl = parseInt(c.env.AUTH_SESSION_TTL_SECONDS ?? "604800", 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl * 1000).toISOString();

  await c.env.DB.prepare(
    "INSERT INTO sessions (id, user_id, username, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(sessionId, session.userId, session.username, expiresAt, now.toISOString())
    .run();

  const payload = btoa(JSON.stringify({ ...session, sessionId }));
  const sig = await hmacSign(c.env.AUTH_SESSION_SECRET, payload);
  const token = `${payload}.${sig}`;
  c.header(
    "Set-Cookie",
    buildSessionCookie(token, ttl, isSecureRequest(c))
  );
}

export async function getSession(
  c: Context<{ Bindings: Env }>
): Promise<SessionData | null> {
  const session = await parseSessionCookie(c);
  if (!session?.sessionId) return null;

  const activeSession = await c.env.DB.prepare(
    "SELECT id, user_id, username FROM sessions WHERE id = ? AND expires_at > ?"
  )
    .bind(session.sessionId, new Date().toISOString())
    .first<{ id: string; user_id: string; username: string }>();

  if (!activeSession) return null;
  return {
    sessionId: activeSession.id,
    userId: activeSession.user_id,
    username: activeSession.username,
  };
}

async function parseSessionCookie(
  c: Context<{ Bindings: Env }>
): Promise<SessionData | null> {
  const cookie = c.req.header("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;

  const [payload, sig] = match[1].split(".");
  if (!payload || !sig) return null;

  const expected = await hmacSign(c.env.AUTH_SESSION_SECRET, payload);
  if (expected !== sig) return null;

  try {
    return JSON.parse(atob(payload)) as SessionData;
  } catch {
    return null;
  }
}

export async function clearSession(
  c: Context<{ Bindings: Env }>,
  sessionId?: string
): Promise<void> {
  if (sessionId) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(sessionId)
      .run();
  }

  c.header(
    "Set-Cookie",
    buildSessionCookie("", 0, isSecureRequest(c))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(password));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
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
