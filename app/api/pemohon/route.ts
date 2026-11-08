import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.role,
        u.divisi_id,
        d.name as divisi_name,
        u.kategori_pemohon_id,
        kp.name as kategori_pemohon_name,
        u.created_at,
        (SELECT COUNT(*) FROM laporan l WHERE l.pemohon_id = u.id) as total_laporan
      FROM users u
      LEFT JOIN divisi d ON u.divisi_id = d.id
      LEFT JOIN kategori_pemohon kp ON u.kategori_pemohon_id = kp.id
      WHERE u.role = 'pemohon'
      ORDER BY u.id ASC
    `).all();

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, username, password, divisi_id, kategori_pemohon_id } = await request.json();

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "Nama Lengkap, Username, dan Password wajib diisi" },
        { status: 400 }
      );
    }

    // Check username uniqueness
    const existing = db.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)").get(username.trim());
    if (existing) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO users (name, username, password, role, divisi_id, kategori_pemohon_id)
      VALUES (?, ?, ?, 'pemohon', ?, ?)
    `).run(
      name.trim(),
      username.trim().toLowerCase(),
      password,
      divisi_id || null,
      kategori_pemohon_id || null
    );

    const created = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, name, username, password, divisi_id, kategori_pemohon_id } = await request.json();

    if (!id || !name || !username) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Check duplicate username
    const existing = db.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?").get(username.trim(), id);
    if (existing) {
      return NextResponse.json({ error: "Username sudah digunakan oleh akun lain" }, { status: 400 });
    }

    if (password && password.trim()) {
      db.prepare(`
        UPDATE users 
        SET name = ?, username = ?, password = ?, divisi_id = ?, kategori_pemohon_id = ?
        WHERE id = ?
      `).run(name.trim(), username.trim().toLowerCase(), password, divisi_id || null, kategori_pemohon_id || null, id);
    } else {
      db.prepare(`
        UPDATE users 
        SET name = ?, username = ?, divisi_id = ?, kategori_pemohon_id = ?
        WHERE id = ?
      `).run(name.trim(), username.trim().toLowerCase(), divisi_id || null, kategori_pemohon_id || null, id);
    }

    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    db.prepare("DELETE FROM users WHERE id = ? AND role = 'pemohon'").run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
