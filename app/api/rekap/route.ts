import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

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
    `;

    const params: any[] = [];
    if (search.trim()) {
      query += ` WHERE (u.name LIKE ? OR l.nomor_tindak_lanjut LIKE ? OR l.deskripsi LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY l.id DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    // Format results with computed status if needed
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
