import { NextResponse } from "next/server";
import { execute, isDuplicateError, queryOne } from "@/lib/db";
import { requireAdmin, requireUser, serverError } from "@/lib/auth";
import { datePrefixWIB, listLaporan } from "@/lib/laporan";
import { isOwnUploadedPhoto, MAX_PHOTOS_PER_LAPORAN } from "@/lib/uploads";

export const dynamic = "force-dynamic";

async function nextNomorTindakLanjut(): Promise<string> {
  const prefix = datePrefixWIB();
  const last = await queryOne<{ nomor_tindak_lanjut: string }>(
    "SELECT nomor_tindak_lanjut FROM laporan WHERE nomor_tindak_lanjut LIKE ? ORDER BY nomor_tindak_lanjut DESC LIMIT 1",
    [`${prefix}-%`]
  );

  let seq = 1;
  const lastSeq = last ? parseInt(last.nomor_tindak_lanjut.split("-")[1], 10) : NaN;
  if (!isNaN(lastSeq)) seq = lastSeq + 1;

  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

// Fields returned after create/verify (no attachments blob, no joins needed).
const LAPORAN_COLUMNS =
  "id, nomor_tindak_lanjut, pemohon_id, kategori_id, region_id, segmentasi, deskripsi, durasi_repair, durasi_laporan, status, is_verified, lokasi, created_at, verified_at";

export async function GET(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const sp = new URL(request.url).searchParams;
    const where: string[] = [];
    const params: (string | number)[] = [];

    // Technicians only ever see their own reports.
    const pemohonId = user.role === "admin" ? sp.get("pemohon_id") : String(user.id);
    if (pemohonId && pemohonId !== "all") {
      where.push("l.pemohon_id = ?");
      params.push(Number(pemohonId));
    }

    const regionId = sp.get("region_id");
    if (regionId && regionId !== "all") {
      where.push("l.region_id = ?");
      params.push(Number(regionId));
    }

    const tanggal = sp.get("tanggal");
    if (tanggal) {
      where.push("DATE(l.created_at) = DATE(?)");
      params.push(tanggal);
    }

    const deskripsi = (sp.get("deskripsi") || "").trim();
    if (deskripsi) {
      where.push("(l.deskripsi LIKE ? OR l.segmentasi LIKE ?)");
      params.push(`%${deskripsi}%`, `%${deskripsi}%`);
    }

    return NextResponse.json(await listLaporan(where, params));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { kategori_id, region_id, segmentasi, deskripsi, attachments, lokasi } = await request.json();

    if (!kategori_id || !region_id || !segmentasi || !deskripsi) {
      return NextResponse.json({ error: "Kategori, Region, Segmentasi, dan Deskripsi wajib diisi" }, { status: 400 });
    }

    // Photos are uploaded first via POST /api/foto; the report only carries their URLs.
    const photos: unknown[] = Array.isArray(attachments) ? attachments : [];
    if (photos.length > MAX_PHOTOS_PER_LAPORAN) {
      return NextResponse.json({ error: `Maksimal ${MAX_PHOTOS_PER_LAPORAN} foto per laporan` }, { status: 400 });
    }
    for (const url of photos) {
      if (!(await isOwnUploadedPhoto(url, user.id))) {
        return NextResponse.json({ error: "Foto tidak valid, silakan unggah ulang" }, { status: 400 });
      }
    }
    const attachmentsJson = JSON.stringify(photos);

    // Two reports submitted at the same moment can compute the same number; retry on collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const nomor = await nextNomorTindakLanjut();
      try {
        const result = await execute(
          `INSERT INTO laporan
           (nomor_tindak_lanjut, pemohon_id, kategori_id, region_id, segmentasi, deskripsi, durasi_repair, durasi_laporan, status, is_verified, attachments, lokasi)
           VALUES (?, ?, ?, ?, ?, ?, 14, 1, 'Proses Lapangan', 0, ?, ?)`,
          [
            nomor,
            user.id,
            Number(kategori_id),
            Number(region_id),
            String(segmentasi).trim(),
            String(deskripsi).trim(),
            attachmentsJson,
            String(lokasi || "").trim(),
          ]
        );
        const created = await queryOne(`SELECT ${LAPORAN_COLUMNS} FROM laporan WHERE id = ?`, [result.insertId]);
        return NextResponse.json({ success: true, data: created });
      } catch (err) {
        if (!isDuplicateError(err)) throw err;
      }
    }
    return NextResponse.json({ error: "Gagal membuat nomor tindak lanjut, silakan coba lagi" }, { status: 503 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id, is_verified, status } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID laporan diperlukan" }, { status: 400 });
    }

    const verified = is_verified !== undefined ? (is_verified ? 1 : 0) : 1;
    const newStatus = status || (verified === 1 ? "Selesai" : "Proses Lapangan");

    await execute(
      `UPDATE laporan SET is_verified = ?, status = ?, verified_at = ${verified === 1 ? "NOW()" : "NULL"} WHERE id = ?`,
      [verified, String(newStatus), Number(id)]
    );

    const updated = await queryOne(`SELECT ${LAPORAN_COLUMNS} FROM laporan WHERE id = ?`, [Number(id)]);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return serverError(error);
  }
}
