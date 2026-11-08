import { cookies } from "next/headers";
import db from "./db";

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

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const parsed = JSON.parse(sessionCookie.value) as SessionUser;
    // Verify user still exists in database
    const user = db
      .prepare(
        `SELECT u.id, u.name, u.username, u.role, u.divisi_id, u.kategori_pemohon_id, d.name as divisi_name
         FROM users u
         LEFT JOIN divisi d ON u.divisi_id = d.id
         WHERE u.id = ?`
      )
      .get(parsed.id) as SessionUser | undefined;

    return user || null;
  } catch {
    return null;
  }
}

export function setSessionCookie(user: SessionUser) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

