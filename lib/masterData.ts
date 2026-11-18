import { NextResponse } from "next/server";
import { execute, isDuplicateError, query, queryOne } from "./db";
import { requireAdmin, requireUser, serverError } from "./auth";

/**
 * Generic CRUD handlers for the simple {id, name} master tables
 * (kategori, region, divisi, kategori_pemohon).
 */
interface MasterConfig {
  table: "kategori" | "region" | "divisi" | "kategori_pemohon";
  label: string; // used in Indonesian error messages, e.g. "kategori"
  /** who may list: any logged-in user, or admins only */
  readAccess: "user" | "admin";
  /** block deletion while rows reference this record */
  usedBy?: { table: string; column: string; where: string };
}

export function masterDataHandlers(cfg: MasterConfig) {
  const { table, label } = cfg;

  async function GET(request: Request) {
    try {
      const { error } = cfg.readAccess === "admin" ? await requireAdmin() : await requireUser();
      if (error) return error;

      const search = (new URL(request.url).searchParams.get("search") || "").trim();
      const rows = search
        ? await query(`SELECT * FROM ${table} WHERE name LIKE ? ORDER BY id ASC`, [`%${search}%`])
        : await query(`SELECT * FROM ${table} ORDER BY id ASC`);
      return NextResponse.json(rows);
    } catch (error) {
      return serverError(error);
    }
  }

  async function POST(request: Request) {
    try {
      const { error } = await requireAdmin();
      if (error) return error;

      const { name } = await request.json();
      if (!name || !String(name).trim()) {
        return NextResponse.json({ error: `Nama ${label} wajib diisi` }, { status: 400 });
      }

      const result = await execute(`INSERT INTO ${table} (name) VALUES (?)`, [String(name).trim()]);
      const created = await queryOne(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
      return NextResponse.json({ success: true, data: created });
    } catch (error) {
      if (isDuplicateError(error)) {
        return NextResponse.json({ error: `Nama ${label} sudah ada` }, { status: 400 });
      }
      return serverError(error);
    }
  }

  async function PUT(request: Request) {
    try {
      const { error } = await requireAdmin();
      if (error) return error;

      const { id, name } = await request.json();
      if (!id || !name || !String(name).trim()) {
        return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
      }

      await execute(`UPDATE ${table} SET name = ? WHERE id = ?`, [String(name).trim(), Number(id)]);
      const updated = await queryOne(`SELECT * FROM ${table} WHERE id = ?`, [Number(id)]);
      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      if (isDuplicateError(error)) {
        return NextResponse.json({ error: `Nama ${label} sudah ada` }, { status: 400 });
      }
      return serverError(error);
    }
  }

  async function DELETE(request: Request) {
    try {
      const { error } = await requireAdmin();
      if (error) return error;

      const id = new URL(request.url).searchParams.get("id");
      if (!id) {
        return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
      }

      if (cfg.usedBy) {
        const used = await queryOne<{ c: number }>(
          `SELECT COUNT(*) AS c FROM ${cfg.usedBy.table} WHERE ${cfg.usedBy.column} = ?`,
          [Number(id)]
        );
        if (used && Number(used.c) > 0) {
          const label1 = label.charAt(0).toUpperCase() + label.slice(1);
          return NextResponse.json(
            { error: `${label1} tidak dapat dihapus karena masih digunakan pada data ${cfg.usedBy.where}` },
            { status: 400 }
          );
        }
      }

      await execute(`DELETE FROM ${table} WHERE id = ?`, [Number(id)]);
      return NextResponse.json({ success: true });
    } catch (error) {
      return serverError(error);
    }
  }

  return { GET, POST, PUT, DELETE };
}
