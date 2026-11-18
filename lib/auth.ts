import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { queryOne } from "./db";

export interface SessionUser {
  id: number;
  name: string;
  username: string;
  role: "admin" | "pemohon";
  divisi_id?: number | null;
  divisi_name?: string | null;
  kategori_pemohon_id?: number | null;
}

const COOKIE_NAME = "avara_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (min. 32 characters) in production");
  }
  return "dev-only-insecure-session-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Token format: base64url(JSON {uid, exp}) + "." + HMAC-SHA256 signature. */
function createToken(userId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): number | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { uid: number; exp: number };
    if (typeof data.uid !== "number" || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = verifyToken(token);
  if (userId === null) return null;

  const user = await queryOne<SessionUser>(
    `SELECT u.id, u.name, u.username, u.role, u.divisi_id, u.kategori_pemohon_id, d.name AS divisi_name
     FROM users u
     LEFT JOIN divisi d ON u.divisi_id = d.id
     WHERE u.id = ?`,
    [userId]
  );
  return user || null;
}

export function setSessionCookie(user: Pick<SessionUser, "id">) {
  cookies().set(COOKIE_NAME, createToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

type AuthResult = { user: SessionUser; error: null } | { user: null; error: NextResponse };

/** Require any logged-in user. Usage: `const { user, error } = await requireUser(); if (error) return error;` */
export async function requireUser(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 }) };
  }
  return { user, error: null };
}

/** Require an admin user. */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user.role !== "admin") {
    return { user: null, error: NextResponse.json({ error: "Akses hanya untuk admin" }, { status: 403 }) };
  }
  return result;
}

/** Log the real error on the server, return a generic message to the client. */
export function serverError(err: unknown, message = "Terjadi kesalahan server") {
  console.error("[avara]", err);
  return NextResponse.json({ error: message }, { status: 500 });
}
