import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";
import { setSessionCookie, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
    }

    const user = await queryOne<any>(
      `SELECT u.id, u.name, u.username, u.password, u.role, u.divisi_id, u.kategori_pemohon_id, d.name AS divisi_name
       FROM users u
       LEFT JOIN divisi d ON u.divisi_id = d.id
       WHERE LOWER(u.username) = LOWER(?)`,
      [String(username).trim()]
    );

    const valid = user ? await bcrypt.compare(String(password), user.password) : false;
    if (!user || !valid) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      divisi_id: user.divisi_id,
      divisi_name: user.divisi_name,
      kategori_pemohon_id: user.kategori_pemohon_id,
    };

    setSessionCookie(sessionUser);
    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error) {
    return serverError(error);
  }
}
