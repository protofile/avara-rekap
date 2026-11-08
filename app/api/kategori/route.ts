import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = "SELECT * FROM kategori";
    const params: any[] = [];
    if (search && search.trim()) {
      query += " WHERE name LIKE ?";
      params.push(`%${search.trim()}%`);
    }
    query += " ORDER BY id ASC";

    const list = db.prepare(query).all(...params);
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const result = db.prepare("INSERT INTO kategori (name) VALUES (?)").run(name.trim());
    const created = db.prepare("SELECT * FROM kategori WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, name } = await request.json();
    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    db.prepare("UPDATE kategori SET name = ? WHERE id = ?").run(name.trim(), id);
    const updated = db.prepare("SELECT * FROM kategori WHERE id = ?").get(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    // Check if category is used in laporan
    const used = db.prepare("SELECT COUNT(*) as count FROM laporan WHERE kategori_id = ?").get(id) as { count: number };
    if (used.count > 0) {
      return NextResponse.json(
        { error: "Kategori tidak dapat dihapus karena masih digunakan pada data laporan" },
        { status: 400 }
      );
    }

    db.prepare("DELETE FROM kategori WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
