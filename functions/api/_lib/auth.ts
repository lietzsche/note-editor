import type { Context } from "hono";
import type { Env, SessionData } from "./types";

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

  const payload = base64UrlEncodeText(JSON.stringify({ ...session, sessionId }));
  const sig = base64UrlEncode(await hmacSignature(c.env.AUTH_SESSION_SECRET, payload));
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

  const verified = await verifyHmacSignature(c.env.AUTH_SESSION_SECRET, payload, sig);
  if (!verified) return null;

  try {
    const decoded = decodeBase64Text(payload);
    if (!decoded) return null;
    return JSON.parse(decoded) as SessionData;
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
