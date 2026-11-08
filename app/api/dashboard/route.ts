import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Tindak Lanjut stats
    const tindakLanjutTotal = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM laporan l
      JOIN kategori k ON l.kategori_id = k.id
      WHERE k.name = 'Tindak Lanjut'
    `).get() as { count: number }).count;

    const tindakLanjutSelesai = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM laporan l
      JOIN kategori k ON l.kategori_id = k.id
      WHERE k.name = 'Tindak Lanjut' AND (l.status = 'Selesai' OR l.is_verified = 1)
    `).get() as { count: number }).count;

    const tindakLanjutProses = tindakLanjutTotal - tindakLanjutSelesai;

    // 2. Non Project stats (PM Non Project)
    const nonProjectTotal = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM laporan l
      JOIN kategori k ON l.kategori_id = k.id
      WHERE k.name = 'PM Non Project'
    `).get() as { count: number }).count;

    const nonProjectSelesai = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM laporan l
      JOIN kategori k ON l.kategori_id = k.id
      WHERE k.name = 'PM Non Project' AND (l.status = 'Selesai' OR l.is_verified = 1)
    `).get() as { count: number }).count;

    const nonProjectProses = nonProjectTotal - nonProjectSelesai;

    // Overall Selesai & Total
    const totalSemua = (db.prepare("SELECT COUNT(*) as count FROM laporan").get() as { count: number }).count;
    const totalSelesai = (db.prepare("SELECT COUNT(*) as count FROM laporan WHERE status = 'Selesai' OR is_verified = 1").get() as { count: number }).count;
    const totalProses = totalSemua - totalSelesai;

    return NextResponse.json({
      tindakLanjut: {
        total: tindakLanjutTotal,
        proses: tindakLanjutProses,
        selesai: tindakLanjutSelesai,
      },
      nonProject: {
        total: nonProjectTotal,
        proses: nonProjectProses,
        selesai: nonProjectSelesai,
      },
      overall: {
        total: totalSemua,
        proses: totalProses,
        selesai: totalSelesai,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
