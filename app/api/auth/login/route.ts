import { NextResponse } from "next/server";
import db from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    const user = db
      .prepare(
        `SELECT u.id, u.name, u.username, u.password, u.role, u.divisi_id, u.kategori_pemohon_id, d.name as divisi_name
         FROM users u
         LEFT JOIN divisi d ON u.divisi_id = d.id
         WHERE LOWER(u.username) = LOWER(?)`
      )
      .get(username.trim()) as any;

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
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

    return NextResponse.json({
      success: true,
      user: sessionUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

