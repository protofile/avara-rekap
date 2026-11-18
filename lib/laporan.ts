import { query } from "./db";

/** Columns + joins shared by the rekap and laporan list endpoints. */
const LAPORAN_SELECT = `
  SELECT
    l.id, l.nomor_tindak_lanjut, l.pemohon_id, u.name AS pemohon,
    l.kategori_id, k.name AS kategori, l.region_id, r.name AS region,
    l.segmentasi, l.deskripsi, l.durasi_repair, l.durasi_laporan,
    l.status, l.is_verified, l.attachments, l.lokasi, l.created_at, l.verified_at
  FROM laporan l
  JOIN users u ON l.pemohon_id = u.id
  JOIN kategori k ON l.kategori_id = k.id
  JOIN region r ON l.region_id = r.id
`;

/** Display status rule: verified/Selesai → Selesai; durasi_laporan ≥ 50% durasi_repair → Warning; else Proses Lapangan. */
export function displayStatus(row: { status: string; is_verified: number; durasi_laporan: number; durasi_repair: number }) {
  if (row.is_verified === 1 || row.status === "Selesai") return "Selesai";
  if (row.durasi_laporan >= row.durasi_repair * 0.5) return "Warning";
  return "Proses Lapangan";
}

function parseAttachments(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listLaporan(where: string[] = [], params: (string | number)[] = []) {
  const sql = LAPORAN_SELECT + (where.length ? ` WHERE ${where.join(" AND ")}` : "") + " ORDER BY l.id DESC";
  const rows = await query<any>(sql, params);
  return rows.map((row) => ({
    ...row,
    status: displayStatus(row),
    attachments: parseAttachments(row.attachments),
  }));
}

/** Today's date prefix (yymmdd) in WIB, independent of the server's timezone. */
export function datePrefixWIB(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}${get("month")}${get("day")}`;
}
