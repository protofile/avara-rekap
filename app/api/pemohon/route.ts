import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { execute, isDuplicateError, query, queryOne } from "@/lib/db";
import { requireAdmin, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Never select the password column here.
const PEMOHON_SELECT = `
  SELECT
    u.id, u.name, u.username, u.role, u.divisi_id, d.name AS divisi_name,
    u.kategori_pemohon_id, kp.name AS kategori_pemohon_name, u.created_at,
    (SELECT COUNT(*) FROM laporan l WHERE l.pemohon_id = u.id) AS total_laporan
  FROM users u
  LEFT JOIN divisi d ON u.divisi_id = d.id
  LEFT JOIN kategori_pemohon kp ON u.kategori_pemohon_id = kp.id
  WHERE u.role = 'pemohon'
`;

const MIN_PASSWORD = 6;

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    return NextResponse.json(await query(`${PEMOHON_SELECT} ORDER BY u.id ASC`));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { name, username, password, divisi_id, kategori_pemohon_id } = await request.json();

    if (!name || !username || !password) {
      return NextResponse.json({ error: "Nama Lengkap, Username, dan Password wajib diisi" }, { status: 400 });
    }
    if (String(password).length < MIN_PASSWORD) {
      return NextResponse.json({ error: `Password minimal ${MIN_PASSWORD} karakter` }, { status: 400 });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const result = await execute(
      `INSERT INTO users (name, username, password, role, divisi_id, kategori_pemohon_id)
       VALUES (?, ?, ?, 'pemohon', ?, ?)`,
      [String(name).trim(), String(username).trim().toLowerCase(), hash, divisi_id || null, kategori_pemohon_id || null]
    );

    const created = await queryOne(`${PEMOHON_SELECT} AND u.id = ?`, [result.insertId]);
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    if (isDuplicateError(error)) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 400 });
    }
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id, name, username, password, divisi_id, kategori_pemohon_id } = await request.json();

    if (!id || !name || !username) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const fields = ["name = ?", "username = ?", "divisi_id = ?", "kategori_pemohon_id = ?"];
    const params: (string | number | null)[] = [
      String(name).trim(),
      String(username).trim().toLowerCase(),
      divisi_id || null,
      kategori_pemohon_id || null,
    ];

    if (password && String(password).trim()) {
      if (String(password).length < MIN_PASSWORD) {
        return NextResponse.json({ error: `Password minimal ${MIN_PASSWORD} karakter` }, { status: 400 });
      }
      fields.push("password = ?");
      params.push(await bcrypt.hash(String(password), 10));
    }

    params.push(Number(id));
    await execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ? AND role = 'pemohon'`, params);

    const updated = await queryOne(`${PEMOHON_SELECT} AND u.id = ?`, [Number(id)]);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isDuplicateError(error)) {
      return NextResponse.json({ error: "Username sudah digunakan oleh akun lain" }, { status: 400 });
    }
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    await execute("DELETE FROM users WHERE id = ? AND role = 'pemohon'", [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
