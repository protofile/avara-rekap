import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireAdmin, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SELESAI = "(l.status = 'Selesai' OR l.is_verified = 1)";

async function stats(kategoriName?: string) {
  const row = await queryOne<{ total: number; selesai: number | string | null }>(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN ${SELESAI} THEN 1 ELSE 0 END) AS selesai
     FROM laporan l
     JOIN kategori k ON l.kategori_id = k.id
     ${kategoriName ? "WHERE k.name = ?" : ""}`,
    kategoriName ? [kategoriName] : []
  );
  const total = Number(row?.total || 0);
  const selesai = Number(row?.selesai || 0);
  return { total, proses: total - selesai, selesai };
}

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const [tindakLanjut, nonProject, overall] = await Promise.all([
      stats("Tindak Lanjut"),
      stats("PM Non Project"),
      stats(),
    ]);

    return NextResponse.json({ tindakLanjut, nonProject, overall });
  } catch (error) {
    return serverError(error);
  }
}
