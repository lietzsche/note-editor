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
  session: SessionData
): Promise<void> {
  const payload = btoa(JSON.stringify(session));
  const sig = await hmacSign(c.env.AUTH_SESSION_SECRET, payload);
  const token = `${payload}.${sig}`;
  const ttl = parseInt(c.env.AUTH_SESSION_TTL_SECONDS ?? "604800", 10);
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ttl}`
  );
}

export async function getSession(
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

export function clearSession(c: Context<{ Bindings: Env }>): void {
  c.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
  );
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(password));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
