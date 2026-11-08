import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function generateNomorTindakLanjut(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${yy}${mm}${dd}`;

  const lastRecord = db
    .prepare("SELECT nomor_tindak_lanjut FROM laporan WHERE nomor_tindak_lanjut LIKE ? ORDER BY id DESC LIMIT 1")
    .get(`${datePrefix}-%`) as { nomor_tindak_lanjut: string } | undefined;

  let nextSeq = 1;
  if (lastRecord && lastRecord.nomor_tindak_lanjut) {
    const parts = lastRecord.nomor_tindak_lanjut.split("-");
    if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
      nextSeq = parseInt(parts[1], 10) + 1;
    }
  }

  return `${datePrefix}-${String(nextSeq).padStart(3, "0")}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get("region_id");
    const pemohonId = searchParams.get("pemohon_id");
    const tanggal = searchParams.get("tanggal");
    const deskripsi = searchParams.get("deskripsi");

    let query = `
      SELECT 
        l.id,
        l.nomor_tindak_lanjut,
        l.pemohon_id,
        u.name as pemohon,
        l.kategori_id,
        k.name as kategori,
        l.region_id,
        r.name as region,
        l.segmentasi,
        l.deskripsi,
        l.durasi_repair,
        l.durasi_laporan,
        l.status,
        l.is_verified,
        l.attachments,
        l.lokasi,
        l.created_at,
        l.verified_at
      FROM laporan l
      JOIN users u ON l.pemohon_id = u.id
      JOIN kategori k ON l.kategori_id = k.id
      JOIN region r ON l.region_id = r.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (regionId && regionId !== "all") {
      query += ` AND l.region_id = ?`;
      params.push(regionId);
    }

    if (pemohonId && pemohonId !== "all") {
      query += ` AND l.pemohon_id = ?`;
      params.push(pemohonId);
    }

    if (tanggal) {
      query += ` AND date(l.created_at) = date(?)`;
      params.push(tanggal);
    }

    if (deskripsi && deskripsi.trim()) {
      query += ` AND (l.deskripsi LIKE ? OR l.segmentasi LIKE ?)`;
      const term = `%${deskripsi.trim()}%`;
      params.push(term, term);
    }

    query += ` ORDER BY l.id DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    const formatted = rows.map((row) => {
      let displayStatus = row.status;
      if (row.is_verified === 1 || row.status === "Selesai") {
        displayStatus = "Selesai";
      } else if (row.durasi_laporan >= row.durasi_repair * 0.5) {
        displayStatus = "Warning";
      } else if (!displayStatus || displayStatus === "Belum selesai") {
        displayStatus = "Proses Lapangan";
      }

      let attachmentsParsed = [];
      try {
        attachmentsParsed = JSON.parse(row.attachments || "[]");
      } catch {
        attachmentsParsed = [];
      }

      return {
        ...row,
        status: displayStatus,
        attachments: attachmentsParsed,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kategori_id, region_id, segmentasi, deskripsi, attachments, lokasi } = await request.json();

    if (!kategori_id || !region_id || !segmentasi || !deskripsi) {
      return NextResponse.json(
        { error: "Kategori, Region, Segmentasi, dan Deskripsi wajib diisi" },
        { status: 400 }
      );
    }

    const nomorTindakLanjut = generateNomorTindakLanjut();
    const attachmentsJson = JSON.stringify(attachments || []);

    const result = db
      .prepare(
        `INSERT INTO laporan 
         (nomor_tindak_lanjut, pemohon_id, kategori_id, region_id, segmentasi, deskripsi, durasi_repair, durasi_laporan, status, is_verified, attachments, lokasi)
         VALUES (?, ?, ?, ?, ?, ?, 14, 1, 'Proses Lapangan', 0, ?, ?)`
      )
      .run(
        nomorTindakLanjut,
        user.id,
        kategori_id,
        region_id,
        segmentasi.trim(),
        deskripsi.trim(),
        attachmentsJson,
        (lokasi || "").trim()
      );

    const created = db.prepare("SELECT * FROM laporan WHERE id = ?").get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Hanya admin yang dapat memverifikasi" }, { status: 403 });
    }

    const { id, is_verified, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID laporan diperlukan" }, { status: 400 });
    }

    const newVerified = is_verified !== undefined ? (is_verified ? 1 : 0) : 1;
    const newStatus = status || (newVerified === 1 ? "Selesai" : "Proses Lapangan");
    const verifiedAt = newVerified === 1 ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE laporan 
      SET is_verified = ?,
          status = ?,
          verified_at = ?
      WHERE id = ?
    `).run(newVerified, newStatus, verifiedAt, id);

    const updated = db.prepare("SELECT * FROM laporan WHERE id = ?").get(id);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
